/* Shared JS for pages - keeps behavior similar to user's original file */
/* Tabs */
function showTab(e) {
  var btn = e.currentTarget;
  var tab = btn.getAttribute('data-tab');
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c=>c.style.display='none');
  var el = document.getElementById(tab);
  if (el) el.style.display = 'block';
}

/* Simulate scan - opens scanner-like behavior (simple) */
function scanCylinder(orderId) {
  alert('Simulated scanning for ' + orderId + '\nCylinder details populated.');
  // In original code, this populated many fields. Keep it simple here.
}

/* Open payments page for order (prefill selected order) */
function openPaymentsForOrder(orderId, customer) {
  // navigate to payments page and prefill via sessionStorage
  sessionStorage.setItem('selectedOrderId', orderId);
  sessionStorage.setItem('selectedCustomer', customer);
  window.location.href = 'payments.html';
}

/* Payments page behaviors */
var selectedPaymentMode = '';
var signatureData = null;
var generatedReceipts = window.generatedReceipts || {};

function initPaymentsPage() {
  // run on payments page load
  var selId = sessionStorage.getItem('selectedOrderId') || '—';
  var selCustomer = sessionStorage.getItem('selectedCustomer') || '—';
  var selOrderEl = document.getElementById('selOrderId');
  var selCustEl = document.getElementById('selCustomer');
  if (selOrderEl) selOrderEl.textContent = selId;
  if (selCustEl) selCustEl.textContent = selCustomer;

  // populate previously generated receipts list
  refreshGeneratedList();

  // initialize signature pad
  var canvas = document.getElementById('signaturePad');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.lineJoin = ctx.lineCap = 'round';
    var drawing = false;
    canvas.addEventListener('mousedown', function(e){ drawing=true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); });
    canvas.addEventListener('mousemove', function(e){ if(drawing){ ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } });
    canvas.addEventListener('mouseup', function(){ drawing=false; });
    canvas.addEventListener('mouseleave', function(){ drawing=false;});
    // touch
    canvas.addEventListener('touchstart', function(e){ e.preventDefault(); drawing=true; var r=canvas.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top); });
    canvas.addEventListener('touchmove', function(e){ e.preventDefault(); if(drawing){ var r=canvas.getBoundingClientRect(); ctx.lineTo(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top); ctx.stroke(); } });
    canvas.addEventListener('touchend', function(){ drawing=false; });
  }
}

/* Payment selection */
function selectPayment(mode) {
  selectedPaymentMode = mode;
  document.querySelectorAll('.pay-option').forEach(el=>el.classList.remove('selected'));
  var el = document.querySelector('.pay-option[data-mode="'+mode+'"]');
  if (el) el.classList.add('selected');
  var qr = document.getElementById('qrBox');
  if (qr) qr.style.display = (mode==='qr') ? 'block' : 'none';
}

/* Replacement toggle */
function toggleReplacement() {
  var cb = document.getElementById('replaceCylinder');
  var opt = document.getElementById('replacementOptions');
  if (!opt) return;
  opt.style.display = cb.checked ? 'block' : 'none';
}

/* Signature */
function clearSignature() {
  var canvas = document.getElementById('signaturePad');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  signatureData = null;
}

function saveSignature() {
  var canvas = document.getElementById('signaturePad');
  if (!canvas) return alert('No signature canvas found');
  signatureData = canvas.toDataURL('image/png');
  alert('Signature saved');
}

/* Save/Complete payment */
function savePayment() {
  var orderId = document.getElementById('selOrderId') ? document.getElementById('selOrderId').textContent : '—';
  var customer = document.getElementById('selCustomer') ? document.getElementById('selCustomer').textContent : '—';
  var replace = document.getElementById('replaceCylinder') && document.getElementById('replaceCylinder').checked ? 'Yes' : 'No';
  var note = document.getElementById('replacementNote') ? document.getElementById('replacementNote').value : '';
  var ts = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  if (!selectedPaymentMode) {
    alert('Please select a payment mode');
    return;
  }

  var receiptHtml = '<!doctype html><html><head><meta charset="utf-8"><title>Receipt - ' + orderId + '</title><link rel="stylesheet" href="style.css"></head><body>';
  receiptHtml += '<div class="card"><h2>Instant Receipt</h2>';
  receiptHtml += '<p><strong>Order:</strong> ' + orderId + '</p>';
  receiptHtml += '<p><strong>Customer:</strong> ' + customer + '</p>';
  receiptHtml += '<p><strong>Payment:</strong> ' + selectedPaymentMode.toUpperCase() + '</p>';
  receiptHtml += '<p><strong>Replacement:</strong> ' + replace + '</p>';
  if (note) receiptHtml += '<p><strong>Note:</strong> ' + note + '</p>';
  receiptHtml += '<p><strong>Timestamp (IST):</strong> ' + ts + '</p>';
  if (signatureData) receiptHtml += '<p><strong>Signature:</strong><br><img src="' + signatureData + '" style="max-width:300px;border:1px solid #ddd;padding:6px;border-radius:6px"/></p>';
  receiptHtml += '</div></body></html>';

  // store generated receipt
  if (!window.generatedReceipts) window.generatedReceipts = {};
  var filename = 'receipt-' + orderId + '-' + Date.now() + '.html';
  window.generatedReceipts[filename] = receiptHtml;

  // update list
  refreshGeneratedList();

  // show success modal
  showSuccessModal('Payment saved and receipt generated');
}

/* Cancel payment - reset state and go back */
function cancelPayment() {
  // reset fields
  if (document.getElementById('selOrderId')) document.getElementById('selOrderId').textContent = '—';
  if (document.getElementById('selCustomer')) document.getElementById('selCustomer').textContent = '—';
  selectPayment('');
  clearSignature();
  document.getElementById('replaceCylinder').checked = false;
  toggleReplacement();
  // optional: navigate back to orders
  window.location.href = 'orders.html';
}

/* Success modal */
function showSuccessModal(msg) {
  var modal = document.getElementById('successModal');
  var area = document.getElementById('successMessage');
  if (area) area.textContent = msg || 'Done';
  if (modal) modal.classList.add('active');
}

function closeSuccessModal() {
  var modal = document.getElementById('successModal');
  if (modal) modal.classList.remove('active');
}

/* Refresh generated receipts list */
function refreshGeneratedList() {
  var list = document.getElementById('generatedList');
  if (!list) return;
  list.innerHTML = '';
  if (!window.generatedReceipts) return;
  Object.keys(window.generatedReceipts).forEach(function(fname){
    var li = document.createElement('li');
    li.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center"><span>' + fname + '</span><div><button class="btn small" onclick="openGenerated(\''+fname+'\')">Open</button> <button class="btn outline small" onclick="removeGenerated(\''+fname+'\')">Delete</button></div></div>';
    list.appendChild(li);
  });
}

/* Open generated receipt in new window */
function openGenerated(fname) {
  var html = window.generatedReceipts && window.generatedReceipts[fname];
  if (!html) return alert('File not found');
  var w = window.open('', '_blank');
  w.document.write(html);
}

/* Remove generated receipt */
function removeGenerated(fname) {
  if (window.generatedReceipts && window.generatedReceipts[fname]) {
    delete window.generatedReceipts[fname];
    refreshGeneratedList();
  }
}

/* ZIP download - includes all base files and generated receipts */
async function downloadZip() {
  // load JSZip and FileSaver if not present
  if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
    // load libs dynamically
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js');
  }
  var zip = new JSZip();
  var filenames = ['index.html','orders.html','payments.html','style.css','script.js'];
  for (var i=0;i<filenames.length;i++) {
    var f = filenames[i];
    try {
      var res = await fetch(f);
      var txt = await res.text();
      zip.file(f, txt);
    } catch (e) {
      console.warn('Could not fetch', f, e);
    }
  }
  if (window.generatedReceipts) {
    for (var name in window.generatedReceipts) {
      zip.file(name, window.generatedReceipts[name]);
    }
  }
  var content = await zip.generateAsync({type:'blob'});
  saveAs(content, 'DeliveryBoyPortal.zip');
}

function loadScript(src){ return new Promise(function(resolve, reject){ var s=document.createElement('script'); s.src=src; s.onload=resolve; s.onerror=reject; document.head.appendChild(s); }); }

/* initialize pages */
document.addEventListener('DOMContentLoaded', function(){
  // if payments page, run init
  if (window.location.pathname.endsWith('payments.html')) {
    initPaymentsPage();
  }
});