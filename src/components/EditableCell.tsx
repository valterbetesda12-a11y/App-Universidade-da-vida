import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Check, X } from 'lucide-react';

interface EditableCellProps {
    value: string;
    onSave: (newValue: string) => void;
    isEditable: boolean;
    type?: 'text' | 'number' | 'select';
    options?: string[]; // For select type
}

export const EditableCell: React.FC<EditableCellProps> = ({ value, onSave, isEditable, type = 'text', options = [] }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    const selectRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing) {
            if (type === 'select') selectRef.current?.focus();
            else inputRef.current?.focus();
        }
    }, [isEditing, type]);

    const handleSave = () => {
        if (currentValue !== value) {
            onSave(currentValue);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setCurrentValue(value);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') handleCancel();
    };

    if (!isEditable) {
        return <span className="text-sm text-[var(--text-dim)] px-2 py-1 block truncate">{value}</span>;
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-1 w-full bg-[var(--surface-color)] px-1 min-h-[28px]">
                {type === 'select' ? (
                    <select
                        ref={selectRef}
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-[var(--input-bg)] border border-blue-500 rounded text-xs text-[var(--text-main)] p-1 outline-none"
                    >
                        <option value="">Selecione...</option>
                        {options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        ref={inputRef}
                        type={type}
                        value={currentValue}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-[var(--input-bg)] border border-blue-500 rounded text-xs text-[var(--text-main)] p-1 outline-none"
                    />
                )}
            </div>
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="group relative cursor-pointer hover:bg-[var(--card-bg)] transition-colors rounded px-2 py-1 flex items-center justify-between min-h-[28px] min-w-[100px]"
        >
            <span className="text-sm text-[var(--text-dim)] truncate font-medium group-hover:text-[var(--text-main)] transition-colors select-none">{value || '-'}</span>
            <Pencil className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-50" />

            {/* Click overlay to trigger edit */}
            <div className="absolute inset-0" onClick={() => setIsEditing(true)}></div>
        </div>
    );
};
