const Modal = ({ open, title, children, onClose }) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 px-4">
      <div className="w-full max-w-3xl rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-stone-600 hover:bg-stone-100">
            Close
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
