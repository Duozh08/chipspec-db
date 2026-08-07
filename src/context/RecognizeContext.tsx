import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import RecognizeModal from '../components/RecognizeModal';

interface RecognizeContextValue {
  open: () => void;
}

const RecognizeContext = createContext<RecognizeContextValue>({ open: () => undefined });

/** 全局截图识别弹框：任何页面点击入口都可打开 */
export function RecognizeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  return (
    <RecognizeContext.Provider value={{ open: openModal }}>
      {children}
      {open && <RecognizeModal onClose={closeModal} />}
    </RecognizeContext.Provider>
  );
}

export function useRecognize() {
  return useContext(RecognizeContext);
}
