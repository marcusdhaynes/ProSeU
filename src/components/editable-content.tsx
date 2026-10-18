'use client';
import React, { useRef } from 'react';
import { useDevMode } from './dev-mode-context';
import { useSiteContent } from './site-content-context';
import { cn } from '@/lib/utils';
import { Minus } from 'lucide-react';

export interface EditableContentProps {
  contentKey: string;
  content: string;
  tag?: keyof JSX.IntrinsicElements;
  className?: string;
  wrapperClassName?: string;
  multiline?: boolean;
  onDelete?: () => void;
  allowDelete?: boolean;
  emptyPlaceholder?: string;
}

export function EditableContent({ 
  contentKey, 
  content: defaultValue, 
  tag: Tag = 'span', 
  className,
  wrapperClassName,
  multiline,
  onDelete,
  allowDelete = true,
  emptyPlaceholder = "[Empty text box]"
}: EditableContentProps) {
  const { isEditMode, setHasUnsavedChanges } = useDevMode();
  const { getContent, updatePendingContent } = useSiteContent();
  const elementRef = useRef<HTMLElement | null>(null);
  
  const displayContent = getContent(contentKey, defaultValue);

  // If marked as deleted, do not render at all so surrounding layout adjusts
  if (displayContent === "__DELETED__") {
    return null;
  }

  const isNumericKey = (key: string) => {
    return key.endsWith('_market') || key.endsWith('_salary') || key.endsWith('_mo') || key.endsWith('_yr');
  };

  const formatNumber = (val: string) => {
    if (!val) return "";
    const clean = val.replace(/[^\d.]/g, "");
    const parts = clean.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0];
  };

  const isEmpty = !displayContent || displayContent.trim() === "";

  // In non-edit mode, if completely empty, collapse and do not render ghost space
  if (!isEditMode && isEmpty) {
    return null;
  }

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    if (!isEditMode) return;
    let newValue = e.currentTarget.innerText.trim();
    if (isNumericKey(contentKey)) {
      newValue = formatNumber(newValue);
    }
    
    if (newValue !== displayContent) {
      updatePendingContent(contentKey, newValue);
      setHasUnsavedChanges(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      if (!multiline || !e.shiftKey) {
        e.preventDefault();
        e.currentTarget.blur();
      }
    }
  };

  const handleDelete = () => {
    updatePendingContent(contentKey, "__DELETED__");
    setHasUnsavedChanges(true);
    if (onDelete) {
      onDelete();
    }
  };
  
  const isNumeric = isNumericKey(contentKey);

  const renderedContent = isNumeric && !isEditMode ? formatNumber(displayContent) : displayContent;

  if (isEditMode) {
    const isBlockTag = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section'].includes(Tag);
    return (
      <span 
        className={cn(
          "relative group/editable",
          isBlockTag ? "block" : "inline-block align-middle",
          wrapperClassName
        )}
      >
        <Tag 
          ref={elementRef as any}
          className={cn(
            className,
            "outline-dashed outline-2 outline-accent/60 rounded p-0.5 cursor-text hover:bg-accent/5 transition-all min-h-[1.2em]",
            isBlockTag ? "block" : "inline-block min-w-[20px]",
            isNumeric && "text-right",
            isEmpty && "text-muted-foreground/40 italic font-normal"
          )}
          contentEditable={true}
          suppressContentEditableWarning={true}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        >
          {isEmpty ? emptyPlaceholder : renderedContent}
        </Tag>

        {/* When left empty, show a small '-' in a circle in the top right to delete entirely */}
        {allowDelete && isEmpty && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleDelete();
            }}
            title="Delete this empty box"
            className="absolute -top-2 -right-2 h-4 w-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform z-30 cursor-pointer border border-background"
          >
            <Minus className="h-2.5 w-2.5 stroke-[3]" />
          </button>
        )}
      </span>
    );
  }

  return (
    <Tag className={cn(className, isNumeric && "text-right")}>
      {renderedContent}
    </Tag>
  );
}
