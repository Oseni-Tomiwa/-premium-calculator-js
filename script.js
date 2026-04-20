/* ── State ── */
let current      = '0';
let prev         = null;
let op           = null;
let freshResult  = false;
let subscribed   = false;
let selectedPlan = 'pro';
let calcCount    = 0;

const plans = {
  basic: { price: '$9.99'  },
  pro:   { price: '$99.90' },
  teams: { price: '$299'   },
};

const opSymbols = { '+': '+', '-': '−', '*': '×', '/': '÷' };

/* ── DOM refs ── */
const resultEl  = document.getElementById('result');
const exprEl    = document.getElementById('expression');
const overlay   = document.getElementById('overlay');
const toastEl   = document.getElementById('toast');

/* ── Display ── */
function updateDisplay() {
  resultEl.textContent = current.length > 10
    ? parseFloat(current).toExponential(4)
    : current;
}

/* ── Calculator logic ── */
function input(digit) {
  if (freshResult) { current = digit; freshResult = false; }
  else current = current === '0' ? digit : current + digit;
  if (current.length > 12) return;
  updateDisplay();
}

function inputDot() {
  if (freshResult) { current = '0.'; freshResult = false; }
  else if (!current.includes('.')) current += '.';
  updateDisplay();
}

function setOp(o) {
  if (op && !freshResult) tryCalculate(true);
  prev = parseFloat(current);
  op = o;
  freshResult = true;
  exprEl.textContent = prev + ' ' + opSymbols[o];
}

function clearAll() {
  current = '0'; prev = null; op = null; freshResult = false;
  exprEl.textContent = '';
  updateDisplay();
}

function backspace() {
  if (freshResult || current === '0' || current === 'Error') return;
  current = current.length > 1 ? current.slice(0, -1) : '0';
  updateDisplay();
}

function toggleSign() {
  current = String(parseFloat(current) * -1);
  updateDisplay();
}

function percent() {
  current = String(parseFloat(current) / 100);
  updateDisplay();
}

function calculate() {
  if (!subscribed) {
    const expr = op && prev !== null
      ? prev + ' ' + opSymbols[op] + ' ' + current
      : current;
    document.getElementById('upgrade-expr').textContent = expr;
    document.getElementById('step-pricing').querySelector('.count').textContent = calcCount;
    overlay.classList.add('show');
    showPricing();
    return;
  }
  tryCalculate(false);
}

function tryCalculate(silent) {
  if (op === null || prev === null) return;
  const b = parseFloat(current);
  let res;
  switch (op) {
    case '+': res = prev + b; break;
    case '-': res = prev - b; break;
    case '*': res = prev * b; break;
    case '/': res = b === 0 ? 'Error' : prev / b; break;
  }
  if (!silent) {
    exprEl.textContent = prev + ' ' + opSymbols[op] + ' ' + b + ' =';
    current = res === 'Error' ? 'Error' : String(parseFloat(res.toFixed(10)));
    op = null; prev = null; freshResult = true;
    updateDisplay();
  } else {
    current = res === 'Error' ? 'Error' : String(parseFloat(res.toFixed(10)));
    prev = parseFloat(current);
  }
}

/* ── Keyboard support ── */
document.addEventListener('keydown', (e) => {
  // Don't hijack typing inside the payment form inputs
  if (e.target.classList.contains('field-input')) return;
  // Don't act if modal is open (except Escape)
  const modalOpen = overlay.classList.contains('show');

  if (e.key === 'Escape') {
    if (modalOpen) closeModal();
    return;
  }

  if (modalOpen) return;

  const key = e.key;

  if (key >= '0' && key <= '9')        { flashBtn(key);   input(key);       return; }
  if (key === '.')                       { flashBtn('.');   inputDot();       return; }
  if (key === '+')                       { flashBtn('+');   setOp('+');       return; }
  if (key === '-')                       { flashBtn('-');   setOp('-');       return; }
  if (key === '*')                       { flashBtn('*');   setOp('*');       return; }
  if (key === '/')  { e.preventDefault(); flashBtn('/');   setOp('/');       return; }
  if (key === 'Enter' || key === '=')    { flashBtn('=');   calculate();      return; }
  if (key === 'Backspace')               { flashBtn('⌫');  backspace();      return; }
  if (key === 'Escape' || key === 'c' || key === 'C') { flashBtn('AC'); clearAll(); return; }
  if (key === '%')                       { flashBtn('%');   percent();        return; }
});

/* Flash the matching on-screen button briefly */
function flashBtn(key) {
  const map = {
    '0':'0','1':'1','2':'2','3':'3','4':'4',
    '5':'5','6':'6','7':'7','8':'8','9':'9',
    '.':'.', '+':'+', '-':'−', '*':'×', '/':'÷',
    '=':'=', '⌫':'AC', 'AC':'AC', '%':'%',
  };
  const label = map[key];
  if (!label) return;
  document.querySelectorAll('.buttons button').forEach(btn => {
    if (btn.textContent.trim() === label) {
      btn.classList.add('btn-flash');
      setTimeout(() => btn.classList.remove('btn-flash'), 120);
    }
  });
}

/* ── Modal / plan helpers ── */
function selectPlan(plan) {
  selectedPlan = plan;
  document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('plan-' + plan).classList.add('selected');
  // preserve the expression text already in the button
  const exprText = document.getElementById('upgrade-expr')
    ? document.getElementById('upgrade-expr').textContent
    : 'your result';
  document.getElementById('upgrade-btn').innerHTML =
    'Upgrade to see <span id="upgrade-expr">' + exprText + '</span>';
}

function showPricing() {
  document.getElementById('step-pricing').style.display = 'block';
  document.getElementById('step-payment').style.display = 'none';
  document.getElementById('step-success').style.display  = 'none';
}

function showPayment() {
  const p = plans[selectedPlan];
  document.getElementById('amount-display').textContent = p.price;
  document.getElementById('pay-label').textContent = 'Pay ' + p.price;
  document.getElementById('step-pricing').style.display = 'none';
  document.getElementById('step-payment').style.display = 'block';
  document.getElementById('step-success').style.display  = 'none';
}

function closeModal() { overlay.classList.remove('show'); }

/* ── Payment form helpers ── */
function formatCard(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 16);
  el.value = v.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 3) v = v.slice(0, 2) + ' / ' + v.slice(2);
  el.value = v;
}

function processPayment() {
  const name   = document.getElementById('card-name').value.trim();
  const number = document.getElementById('card-number').value.replace(/\s/g, '');
  const expiry = document.getElementById('card-expiry').value.trim();
  const cvc    = document.getElementById('card-cvc').value.trim();

  if (!name || number.length < 16 || expiry.length < 7 || cvc.length < 3) {
    document.querySelectorAll('#step-payment .field-input').forEach(i => {
      if (!i.value.trim()) i.style.borderColor = '#e74c3c';
    });
    setTimeout(() => {
      document.querySelectorAll('#step-payment .field-input').forEach(i => {
        i.style.borderColor = '';
      });
    }, 1200);
    return;
  }

  const btn     = document.getElementById('pay-btn');
  const label   = document.getElementById('pay-label');
  const spinner = document.getElementById('spinner');
  btn.classList.add('loading');
  label.textContent = 'Processing…';
  spinner.style.display = 'block';

  setTimeout(() => {
    btn.classList.remove('loading');
    spinner.style.display = 'none';
    document.getElementById('step-payment').style.display = 'none';
    document.getElementById('step-success').style.display  = 'block';
  }, 2200);
}

function finishSubscribe() {
  subscribed = true;
  overlay.classList.remove('show');
  toastEl.style.display = 'block';
  setTimeout(() => { toastEl.style.display = 'none'; }, 3000);
  tryCalculate(false);
}
