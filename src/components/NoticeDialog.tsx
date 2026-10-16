import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function NoticeDialog({ title, description, onClose, restoreFocus }: { title: string; description: string; onClose: () => void; restoreFocus: () => void }) {
  return <Dialog open onOpenChange={open => { if (!open) onClose() }}>
    <DialogContent className="action-notice" onCloseAutoFocus={event => { event.preventDefault(); restoreFocus() }}>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
      <DialogClose asChild><Button className="bg-[#D28A4C] hover:bg-[#E89B55] text-[#140D0A] font-bold text-xs h-9 px-5 cursor-pointer">Entendi</Button></DialogClose>
    </DialogContent>
  </Dialog>
}
