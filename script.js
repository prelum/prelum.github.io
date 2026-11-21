// Copy buttons: "copy" becomes "copied" for 1.5 s.
for (const button of document.querySelectorAll('[data-copy]')) {
  const label = button.textContent;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = button.dataset.done;
      setTimeout(() => {
        button.textContent = label;
      }, 1500);
    } catch {
      // Clipboard blocked (e.g. no HTTPS): the command stays visible to select by hand.
    }
  });
}
