window.showModal = function({ title = 'Info', body = '', okText = 'OK', cancelText = 'Anuluj', type = 'alert' }) {
  const backdrop = document.getElementById('modal-backdrop');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const okBtn = document.getElementById('modal-ok');
  const cancelBtn = document.getElementById('modal-cancel');

  if (!backdrop || !titleEl || !bodyEl || !okBtn || !cancelBtn) return Promise.resolve(false);

  titleEl.textContent = title;
  bodyEl.innerHTML = body;

  okBtn.textContent = okText;
  cancelBtn.textContent = cancelText;

  if (type === 'confirm') {
    cancelBtn.classList.remove('hidden');
  } else {
    cancelBtn.classList.add('hidden');
  }

  backdrop.classList.remove('hidden');

  return new Promise(resolve => {
    const cleanup = () => {
      backdrop.classList.add('hidden');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    okBtn.onclick = () => { cleanup(); resolve(true); };
    cancelBtn.onclick = () => { cleanup(); resolve(false); };
    backdrop.onclick = (e) => {
      if (e.target === backdrop) { cleanup(); resolve(false); }
    };
  });
};
