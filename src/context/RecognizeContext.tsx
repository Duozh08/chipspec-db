import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import RecognizeModal from '../components/RecognizeModal';
import PendingListModal from '../components/PendingListModal';

interface RecognizeContextValue {
  /** 打开截图识别弹框 */
  open: () => void;
  /** 打开待收录明细弹框（右上角徽章） */
  openPending: () => void;
}

const RecognizeContext = createContext<RecognizeContextValue>({
  open: () => undefined,
  openPending: () => undefined,
});

/** 全局截图识别弹框 + 待收录明细弹框：任何页面点击入口都可打开 */
export function RecognizeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);
  const openPendingModal = useCallback(() => setPendingOpen(true), []);
  const closePendingModal = useCallback(() => setPendingOpen(false), []);

  return (
    <RecognizeContext.Provider value={{ open: openModal, openPending: openPendingModal }}>
      {children}
      {open && <RecognizeModal onClose={closeModal} />}
      {pendingOpen && <PendingListModal onClose={closePendingModal} />}
    </RecognizeContext.Provider>
  );
}

export function useRecognize() {
  return useContext(RecognizeContext);
}
