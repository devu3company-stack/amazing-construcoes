import { useData } from '../context/DataContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function ToastContainer() {
    const { toasts } = useData();

    if (toasts.length === 0) return null;

    const icons = {
        success: <CheckCircle2 size={18} style={{ color: 'var(--success)' }} />,
        error: <AlertCircle size={18} style={{ color: 'var(--danger)' }} />,
        info: <Info size={18} style={{ color: 'var(--info)' }} />,
    };

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div className={`toast ${toast.type}`} key={toast.id}>
                    {icons[toast.type] || icons.info}
                    <span className="toast-message">{toast.message}</span>
                </div>
            ))}
        </div>
    );
}
