/* ==========================================================================
   dashboard.js — Lógica do Dashboard Financeiro Pedro & Glícia
   Responsável por: CRUD de lançamentos (Table API), filtros, KPIs,
   gráficos (Chart.js), calendário de vencimentos, upload de comprovante,
   exportação em PDF (jsPDF) e compartilhamento via WhatsApp.
   ========================================================================== */

(function () {
  'use strict';

  var TABLE = 'transactions';

  var CATEGORIAS = {
    'Crédito': ['Salário', 'Benefício', 'Restituição de Imposto de Renda', 'Décimo Terceiro', 'Férias', 'Outra Receita'],
    'Débito': ['Cartão de Crédito', 'Água', 'Energia Elétrica', 'Telefone/Internet', 'Faculdade', 'Imóvel', 'Dívidas', 'Alimentação', 'Transporte', 'Outra Despesa']
  };

  var state = {
    transactions: [],
    editId: null,
    pendingDeleteId: null,
    filters: { search: '', tipo: '', responsavel: '', status: '' },
    calendarDate: new Date(),
    selectedFile: null
  };

  var charts = { barras: null, donut: null, linha: null };

  /* ------------------------------------------------------------------
     UTILITÁRIOS
     ------------------------------------------------------------------ */
  function formatBRL(value) {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatDateBR(isoString) {
    if (!isoString) return '-';
    var d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('pt-BR');
  }

  function el(id) { return document.getElementById(id); }

  function showToast(message, type) {
    var container = el('toastContainer');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast' + (type === 'error' ? ' error' : '');
    toast.setAttribute('role', 'status');
    toast.innerHTML = '<i class="fa-solid ' + (type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check') + '" aria-hidden="true"></i> ' + message;
    container.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(function () { toast.remove(); }, 300);
    }, 3800);
  }

  /* ------------------------------------------------------------------
     CATEGORIAS DINÂMICAS conforme o tipo selecionado
     ------------------------------------------------------------------ */
  function populateCategorias(tipo) {
    var select = el('categoria');
    if (!select) return;
    var current = select.value;
    select.innerHTML = '';
    (CATEGORIAS[tipo] || []).forEach(function (cat) {
      var opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });
    if ((CATEGORIAS[tipo] || []).indexOf(current) !== -1) {
      select.value = current;
    }
  }

  function getTipoSelecionado() {
    var checked = document.querySelector('input[name="tipo"]:checked');
    return checked ? checked.value : 'Crédito';
  }

  /* ------------------------------------------------------------------
     TABLE API — CRUD
     ------------------------------------------------------------------ */
  function apiList() {
    return fetch('tables/' + TABLE + '?limit=500&sort=data')
      .then(function (res) { return res.json(); })
      .then(function (json) { return (json && json.data) ? json.data : []; });
  }

  function apiCreate(payload) {
    return fetch('tables/' + TABLE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('Falha ao criar lançamento');
      return res.json();
    });
  }

  function apiUpdate(id, payload) {
    return fetch('tables/' + TABLE + '/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('Falha ao atualizar lançamento');
      return res.json();
    });
  }

  function apiDelete(id) {
    return fetch('tables/' + TABLE + '/' + id, { method: 'DELETE' })
      .then(function (res) {
        if (!res.ok && res.status !== 204) throw new Error('Falha ao excluir lançamento');
        return true;
      });
  }

  /* ------------------------------------------------------------------
     CARREGAR E RENDERIZAR
     ------------------------------------------------------------------ */
  function loadTransactions() {
    var tbody = el('tableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;"><span class="spinner" aria-hidden="true"></span> Carregando lançamentos...</td></tr>';
    }
    return apiList().then(function (rows) {
      state.transactions = rows || [];
      renderAll();
    }).catch(function (err) {
      console.error(err);
      showToast('Não foi possível carregar os lançamentos.', 'error');
      if (tbody) tbody.innerHTML = '';
    });
  }

  function getFilteredTransactions() {
    return state.transactions.filter(function (t) {
      var matchesSearch = !state.filters.search ||
        (t.descricao || '').toLowerCase().indexOf(state.filters.search) !== -1 ||
        (t.categoria || '').toLowerCase().indexOf(state.filters.search) !== -1;
      var matchesTipo = !state.filters.tipo || t.tipo === state.filters.tipo;
      var matchesResp = !state.filters.responsavel || t.responsavel === state.filters.responsavel;
      var matchesStatus = !state.filters.status || t.status === state.filters.status;
      return matchesSearch && matchesTipo && matchesResp && matchesStatus;
    }).sort(function (a, b) {
      return new Date(b.data) - new Date(a.data);
    });
  }

  function renderAll() {
    renderTable();
    renderKPIs();
    renderCharts();
    renderCalendar();
  }

  function renderTable() {
    var tbody = el('tableBody');
    var emptyState = el('emptyState');
    if (!tbody) return;
    var rows = getFilteredTransactions();

    if (rows.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = rows.map(function (t) {
      var tipoBadge = t.tipo === 'Crédito'
        ? '<span class="badge badge-credit"><i class="fa-solid fa-arrow-down" aria-hidden="true"></i> Crédito</span>'
        : '<span class="badge badge-debit"><i class="fa-solid fa-arrow-up" aria-hidden="true"></i> Débito</span>';
      var statusBadge = t.status === 'Pago'
        ? '<span class="badge badge-paid">Pago</span>'
        : '<span class="badge badge-pending">Pendente</span>';
      var comprovante = t.comprovante_nome ? ' <i class="fa-solid fa-paperclip" title="Possui comprovante: ' + escapeHtml(t.comprovante_nome) + '" aria-hidden="true"></i>' : '';
      return '<tr>' +
        '<td>' + formatDateBR(t.data) + '</td>' +
        '<td>' + tipoBadge + '</td>' +
        '<td>' + escapeHtml(t.categoria || '') + '</td>' +
        '<td>' + escapeHtml(t.descricao || '') + comprovante + '</td>' +
        '<td>' + escapeHtml(t.responsavel || '') + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td>' + formatBRL(t.valor) + '</td>' +
        '<td><div class="row-actions">' +
          '<button type="button" class="icon-btn" data-action="edit" data-id="' + t.id + '" aria-label="Editar lançamento"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>' +
          '<button type="button" class="icon-btn danger" data-action="delete" data-id="' + t.id + '" aria-label="Excluir lançamento"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>' +
        '</div></td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('[data-action="edit"]').forEach(function (btn) {
      btn.addEventListener('click', function () { startEdit(btn.getAttribute('data-id')); });
    });
    tbody.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function () { openDeleteModal(btn.getAttribute('data-id')); });
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderKPIs() {
    var rows = getFilteredTransactions();
    var totalCredito = 0, totalDebito = 0, pendentes = 0;
    rows.forEach(function (t) {
      var valor = parseFloat(t.valor) || 0;
      if (t.tipo === 'Crédito') totalCredito += valor;
      else totalDebito += valor;
      if (t.status === 'Pendente') pendentes++;
    });
    el('kpiCredito').textContent = formatBRL(totalCredito);
    el('kpiDebito').textContent = formatBRL(totalDebito);
    el('kpiSaldo').textContent = formatBRL(totalCredito - totalDebito);
    el('kpiPendentes').textContent = pendentes;
  }

  /* ------------------------------------------------------------------
     GRÁFICOS (Chart.js)
     ------------------------------------------------------------------ */
  function renderCharts() {
    if (!window.Chart) return;
    var rows = getFilteredTransactions();

    // ---- Gráfico de barras: Entradas x Saídas por mês ----
    var monthMap = {};
    rows.forEach(function (t) {
      var d = new Date(t.data);
      if (isNaN(d.getTime())) return;
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (!monthMap[key]) monthMap[key] = { credito: 0, debito: 0 };
      if (t.tipo === 'Crédito') monthMap[key].credito += parseFloat(t.valor) || 0;
      else monthMap[key].debito += parseFloat(t.valor) || 0;
    });
    var monthKeys = Object.keys(monthMap).sort();
    var monthLabels = monthKeys.map(function (k) {
      var parts = k.split('-');
      var d = new Date(parts[0], parts[1] - 1, 1);
      return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    });

    var barCanvas = el('chartBarras');
    if (barCanvas) {
      if (charts.barras) charts.barras.destroy();
      charts.barras = new window.Chart(barCanvas, {
        type: 'bar',
        data: {
          labels: monthLabels.length ? monthLabels : ['Sem dados'],
          datasets: [
            { label: 'Entradas', data: monthKeys.map(function (k) { return monthMap[k].credito; }), backgroundColor: '#34d399', borderRadius: 6 },
            { label: 'Saídas', data: monthKeys.map(function (k) { return monthMap[k].debito; }), backgroundColor: '#fb7185', borderRadius: 6 }
          ]
        },
        options: chartBaseOptions()
      });
    }

    // ---- Gráfico de rosca: Saídas por categoria ----
    var catMap = {};
    rows.filter(function (t) { return t.tipo === 'Débito'; }).forEach(function (t) {
      var cat = t.categoria || 'Outros';
      catMap[cat] = (catMap[cat] || 0) + (parseFloat(t.valor) || 0);
    });
    var catLabels = Object.keys(catMap);
    var catColors = ['#06b6d4', '#2d5128', '#fb7185', '#fbbf24', '#818cf8', '#34d399', '#f472b6', '#a3a9ad', '#22d3ee', '#4a7a3f'];

    var donutCanvas = el('chartDonut');
    if (donutCanvas) {
      if (charts.donut) charts.donut.destroy();
      charts.donut = new window.Chart(donutCanvas, {
        type: 'doughnut',
        data: {
          labels: catLabels.length ? catLabels : ['Sem despesas'],
          datasets: [{
            data: catLabels.length ? catLabels.map(function (c) { return catMap[c]; }) : [1],
            backgroundColor: catLabels.length ? catColors : ['#202429'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#b7c0c7', boxWidth: 12, font: { size: 11 } } }
          }
        }
      });
    }

    // ---- Gráfico de linha: Evolução do saldo ----
    var sorted = rows.slice().sort(function (a, b) { return new Date(a.data) - new Date(b.data); });
    var running = 0;
    var lineLabels = [];
    var lineData = [];
    sorted.forEach(function (t) {
      running += t.tipo === 'Crédito' ? (parseFloat(t.valor) || 0) : -(parseFloat(t.valor) || 0);
      lineLabels.push(formatDateBR(t.data));
      lineData.push(running);
    });

    var lineCanvas = el('chartLinha');
    if (lineCanvas) {
      if (charts.linha) charts.linha.destroy();
      charts.linha = new window.Chart(lineCanvas, {
        type: 'line',
        data: {
          labels: lineLabels.length ? lineLabels : ['Sem dados'],
          datasets: [{
            label: 'Saldo acumulado',
            data: lineData.length ? lineData : [0],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6,182,212,0.15)',
            fill: true,
            tension: 0.35,
            pointRadius: 3
          }]
        },
        options: chartBaseOptions()
      });
    }
  }

  function chartBaseOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#b7c0c7' } } },
      scales: {
        x: { ticks: { color: '#7c8790' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: { ticks: { color: '#7c8790' }, grid: { color: 'rgba(255,255,255,0.06)' } }
      }
    };
  }

  /* ------------------------------------------------------------------
     CALENDÁRIO DE VENCIMENTOS
     ------------------------------------------------------------------ */
  function renderCalendar() {
    var grid = el('calendarGrid');
    var label = el('calMonthLabel');
    if (!grid || !label) return;

    var year = state.calendarDate.getFullYear();
    var month = state.calendarDate.getMonth();
    label.textContent = state.calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var today = new Date();

    var eventsByDay = {};
    state.transactions.forEach(function (t) {
      var d = new Date(t.data);
      if (d.getFullYear() === year && d.getMonth() === month) {
        var day = d.getDate();
        if (!eventsByDay[day]) eventsByDay[day] = { credito: false, debito: false };
        if (t.tipo === 'Crédito') eventsByDay[day].credito = true;
        else eventsByDay[day].debito = true;
      }
    });

    var weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    var html = weekdays.map(function (w) { return '<div class="cal-weekday">' + w + '</div>'; }).join('');

    for (var i = 0; i < firstDay; i++) {
      html += '<div class="calendar-day is-empty" aria-hidden="true"></div>';
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
      var ev = eventsByDay[day];
      var dots = '';
      if (ev) {
        dots = '<div class="dot-wrap">' +
          (ev.credito ? '<span class="dot credit" aria-hidden="true"></span>' : '') +
          (ev.debito ? '<span class="dot debit" aria-hidden="true"></span>' : '') +
          '</div>';
      }
      html += '<div class="calendar-day' + (isToday ? ' is-today' : '') + '" title="Dia ' + day + '">' + day + dots + '</div>';
    }

    grid.innerHTML = html;
  }

  /* ------------------------------------------------------------------
     FORMULÁRIO — validação, upload, criação/edição
     ------------------------------------------------------------------ */
  function validateForm() {
    var valid = true;
    var categoria = el('categoria').value;
    var valor = parseFloat(el('valor').value);
    var descricao = el('descricao').value.trim();
    var data = el('data').value;

    clearFieldErrors();

    if (!categoria) { setFieldError('categoria', 'Selecione uma categoria.'); valid = false; }
    if (!valor || valor <= 0) { setFieldError('valor', 'Informe um valor maior que zero.'); valid = false; }
    if (!descricao) { setFieldError('descricao', 'Descreva o lançamento.'); valid = false; }
    if (!data) { setFieldError('data', 'Selecione a data.'); valid = false; }

    return valid;
  }

  function setFieldError(field, message) {
    var span = el('err-' + field);
    if (span) span.textContent = message;
    var input = el(field);
    if (input) input.style.borderColor = '#fb7185';
  }

  function clearFieldErrors() {
    ['categoria', 'valor', 'descricao', 'data'].forEach(function (field) {
      var span = el('err-' + field);
      if (span) span.textContent = '';
      var input = el(field);
      if (input) input.style.borderColor = '';
    });
  }

  function showFormMsg(message, type) {
    var msg = el('formMsg');
    if (!msg) return;
    msg.textContent = message;
    msg.className = 'form-msg is-visible ' + type;
    setTimeout(function () { msg.classList.remove('is-visible'); }, 4000);
  }

  function resetForm() {
    el('transactionForm').reset();
    el('editId').value = '';
    state.editId = null;
    state.selectedFile = null;
    populateCategorias('Crédito');
    var preview = el('fileNamePreview');
    if (preview) preview.classList.remove('is-visible');
    el('btnSubmit').innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Salvar Lançamento';
    el('btnCancelEdit').style.display = 'none';
    clearFieldErrors();
  }

  function startEdit(id) {
    var t = state.transactions.find(function (x) { return x.id === id; });
    if (!t) return;
    state.editId = id;
    el('editId').value = id;

    document.getElementById(t.tipo === 'Crédito' ? 'tipoCredito' : 'tipoDebito').checked = true;
    populateCategorias(t.tipo);
    el('categoria').value = t.categoria || '';
    el('valor').value = t.valor || '';
    el('descricao').value = t.descricao || '';
    el('data').value = t.data ? t.data.substring(0, 10) : '';
    el('formaPagamento').value = t.forma_pagamento || 'Pix';
    el('responsavel').value = t.responsavel || 'Ambos';
    el('status').value = t.status || 'Pago';
    el('observacoes').value = t.observacoes || '';

    var preview = el('fileNamePreview');
    var previewText = el('fileNameText');
    if (t.comprovante_nome) {
      previewText.textContent = t.comprovante_nome;
      preview.classList.add('is-visible');
    } else if (preview) {
      preview.classList.remove('is-visible');
    }

    el('btnSubmit').innerHTML = '<i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Atualizar Lançamento';
    el('btnCancelEdit').style.display = 'inline-flex';
    document.getElementById('form-lancamento').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openDeleteModal(id) {
    state.pendingDeleteId = id;
    el('modalConfirm').classList.add('is-open');
    el('modalConfirmDelete').focus();
  }

  function closeDeleteModal() {
    state.pendingDeleteId = null;
    el('modalConfirm').classList.remove('is-open');
  }

  /* ------------------------------------------------------------------
     UPLOAD DE ARQUIVO (metadados apenas — sem armazenamento binário)
     ------------------------------------------------------------------ */
  function handleFileSelection(file) {
    if (!file) return;
    var allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.indexOf(file.type) === -1) {
      showToast('Formato de arquivo não suportado. Use PDF, JPG, PNG ou WEBP.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Arquivo muito grande. O limite é 5MB.', 'error');
      return;
    }
    state.selectedFile = file;
    var preview = el('fileNamePreview');
    var previewText = el('fileNameText');
    previewText.textContent = file.name;
    preview.classList.add('is-visible');
  }

  /* ------------------------------------------------------------------
     WHATSAPP — compartilhar resumo
     ------------------------------------------------------------------ */
  function shareViaWhatsApp() {
    var rows = getFilteredTransactions();
    var totalCredito = 0, totalDebito = 0;
    rows.forEach(function (t) {
      if (t.tipo === 'Crédito') totalCredito += parseFloat(t.valor) || 0;
      else totalDebito += parseFloat(t.valor) || 0;
    });
    var saldo = totalCredito - totalDebito;
    var texto = 'Resumo financeiro — Pedro & Glícia' + '\n' +
      'Entradas: ' + formatBRL(totalCredito) + '\n' +
      'Saídas: ' + formatBRL(totalDebito) + '\n' +
      'Saldo: ' + formatBRL(saldo) + '\n' +
      'Lançamentos no período: ' + rows.length + '\n' +
      'Fazendo a economia acontecer 💚';
    var url = 'https://wa.me/?text=' + encodeURIComponent(texto);
    window.open(url, '_blank', 'noopener');
  }

  /* ------------------------------------------------------------------
     EXPORTAÇÃO EM PDF (jsPDF + autotable)
     ------------------------------------------------------------------ */
  function exportPdf() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast('Biblioteca de PDF ainda carregando, tente novamente em instantes.', 'error');
      return;
    }
    var rows = getFilteredTransactions();
    var doc = new window.jspdf.jsPDF();

    var totalCredito = 0, totalDebito = 0;
    rows.forEach(function (t) {
      if (t.tipo === 'Crédito') totalCredito += parseFloat(t.valor) || 0;
      else totalDebito += parseFloat(t.valor) || 0;
    });

    doc.setFontSize(16);
    doc.setTextColor(6, 182, 212);
    doc.text('Pedro & Glícia — Relatório Financeiro', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text('Fazendo a economia acontecer | Fortaleza, CE', 14, 24);
    doc.text('Gerado em: ' + new Date().toLocaleString('pt-BR'), 14, 29);

    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text('Total de Entradas: ' + formatBRL(totalCredito), 14, 40);
    doc.text('Total de Saídas: ' + formatBRL(totalDebito), 14, 46);
    doc.text('Saldo do período: ' + formatBRL(totalCredito - totalDebito), 14, 52);

    var body = rows.map(function (t) {
      return [
        formatDateBR(t.data),
        t.tipo,
        t.categoria || '',
        t.descricao || '',
        t.responsavel || '',
        t.status || '',
        formatBRL(t.valor)
      ];
    });

    doc.autoTable({
      startY: 60,
      head: [['Data', 'Tipo', 'Categoria', 'Descrição', 'Responsável', 'Status', 'Valor']],
      body: body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [6, 182, 212], textColor: [0, 15, 18] },
      alternateRowStyles: { fillColor: [240, 248, 250] }
    });

    doc.save('relatorio-financeiro-pedro-glicia.pdf');
    showToast('Relatório em PDF gerado com sucesso!');
  }

  /* ------------------------------------------------------------------
     EVENTOS
     ------------------------------------------------------------------ */
  function bindEvents() {
    document.querySelectorAll('input[name="tipo"]').forEach(function (radio) {
      radio.addEventListener('change', function () { populateCategorias(getTipoSelecionado()); });
    });

    var form = el('transactionForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validateForm()) {
          showFormMsg('Verifique os campos destacados em vermelho.', 'error');
          return;
        }

        var payload = {
          tipo: getTipoSelecionado(),
          categoria: el('categoria').value,
          descricao: el('descricao').value.trim(),
          valor: parseFloat(el('valor').value),
          data: el('data').value,
          forma_pagamento: el('formaPagamento').value,
          responsavel: el('responsavel').value,
          status: el('status').value,
          observacoes: el('observacoes').value.trim(),
          comprovante_nome: state.selectedFile ? state.selectedFile.name : (el('editId').value ? undefined : '')
        };

        var submitBtn = el('btnSubmit');
        var originalHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Salvando...';

        var request = state.editId ? apiUpdate(state.editId, payload) : apiCreate(payload);

        request.then(function () {
          showFormMsg(state.editId ? 'Lançamento atualizado com sucesso!' : 'Lançamento adicionado com sucesso!', 'success');
          showToast(state.editId ? 'Lançamento atualizado.' : 'Novo lançamento registrado.');
          resetForm();
          return loadTransactions();
        }).catch(function (err) {
          console.error(err);
          showFormMsg('Ocorreu um erro ao salvar. Tente novamente.', 'error');
          showToast('Erro ao salvar lançamento.', 'error');
        }).finally(function () {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalHtml;
        });
      });
    }

    var btnCancelEdit = el('btnCancelEdit');
    if (btnCancelEdit) btnCancelEdit.addEventListener('click', resetForm);

    // Upload de arquivo (clique e drag-and-drop)
    var fileDrop = el('fileDrop');
    var fileInput = el('fileInput');
    if (fileDrop && fileInput) {
      fileDrop.addEventListener('click', function () { fileInput.click(); });
      fileDrop.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
      });
      fileInput.addEventListener('change', function () { handleFileSelection(fileInput.files[0]); });

      ['dragenter', 'dragover'].forEach(function (evt) {
        fileDrop.addEventListener(evt, function (e) { e.preventDefault(); fileDrop.classList.add('is-dragover'); });
      });
      ['dragleave', 'drop'].forEach(function (evt) {
        fileDrop.addEventListener(evt, function (e) { e.preventDefault(); fileDrop.classList.remove('is-dragover'); });
      });
      fileDrop.addEventListener('drop', function (e) {
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileSelection(e.dataTransfer.files[0]);
      });
    }

    var removeFile = el('removeFile');
    if (removeFile) {
      removeFile.addEventListener('click', function (e) {
        e.stopPropagation();
        state.selectedFile = null;
        fileInput.value = '';
        el('fileNamePreview').classList.remove('is-visible');
      });
    }

    // Filtros
    var filterSearch = el('filterSearch');
    if (filterSearch) filterSearch.addEventListener('input', function () {
      state.filters.search = filterSearch.value.trim().toLowerCase();
      renderAll();
    });
    var filterTipo = el('filterTipo');
    if (filterTipo) filterTipo.addEventListener('change', function () { state.filters.tipo = filterTipo.value; renderAll(); });
    var filterResp = el('filterResponsavel');
    if (filterResp) filterResp.addEventListener('change', function () { state.filters.responsavel = filterResp.value; renderAll(); });
    var filterStatus = el('filterStatus');
    if (filterStatus) filterStatus.addEventListener('change', function () { state.filters.status = filterStatus.value; renderAll(); });
    var btnClearFilters = el('btnClearFilters');
    if (btnClearFilters) btnClearFilters.addEventListener('click', function () {
      state.filters = { search: '', tipo: '', responsavel: '', status: '' };
      filterSearch.value = ''; filterTipo.value = ''; filterResp.value = ''; filterStatus.value = '';
      renderAll();
    });

    // Ações do topo
    var btnRefresh = el('btnRefresh');
    if (btnRefresh) btnRefresh.addEventListener('click', function () {
      loadTransactions().then(function () { showToast('Dados atualizados.'); });
    });
    var btnExportPdf = el('btnExportPdf');
    if (btnExportPdf) btnExportPdf.addEventListener('click', exportPdf);
    var btnShareWhats = el('btnShareWhats');
    if (btnShareWhats) btnShareWhats.addEventListener('click', shareViaWhatsApp);

    // Modal exclusão
    var modalCancel = el('modalCancel');
    if (modalCancel) modalCancel.addEventListener('click', closeDeleteModal);
    var modalConfirmDelete = el('modalConfirmDelete');
    if (modalConfirmDelete) modalConfirmDelete.addEventListener('click', function () {
      if (!state.pendingDeleteId) return;
      apiDelete(state.pendingDeleteId).then(function () {
        showToast('Lançamento excluído.');
        closeDeleteModal();
        return loadTransactions();
      }).catch(function (err) {
        console.error(err);
        showToast('Erro ao excluir lançamento.', 'error');
        closeDeleteModal();
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el('modalConfirm').classList.contains('is-open')) closeDeleteModal();
    });

    // Calendário
    var calPrev = el('calPrev');
    var calNext = el('calNext');
    if (calPrev) calPrev.addEventListener('click', function () {
      state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
      renderCalendar();
    });
    if (calNext) calNext.addEventListener('click', function () {
      state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
      renderCalendar();
    });
  }

  /* ------------------------------------------------------------------
     PERFIL ATIVO (definido na Área do Cliente)
     ------------------------------------------------------------------ */
  function applyActiveProfile() {
    var stored = localStorage.getItem('pg_perfil_ativo');
    var whoLabel = el('whoLabel');
    if (stored && whoLabel) {
      whoLabel.textContent = stored;
      var respSelect = el('responsavel');
      if (respSelect) respSelect.value = stored;
    }
  }

  /* ------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', function () {
    if (!el('transactionForm')) return; // não está na página dashboard
    populateCategorias('Crédito');
    applyActiveProfile();
    bindEvents();

    // Define data padrão como hoje
    var dataInput = el('data');
    if (dataInput) dataInput.value = new Date().toISOString().substring(0, 10);

    loadTransactions();
  });
})();
