/**
 * Mock for shadcn/ui components in Jest tests.
 * These components use @base-ui/react which doesn't work well in jsdom.
 */
import React from "react";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }
>(({ children, ...props }, ref) => (
  <button ref={ref} {...props}>
    {children}
  </button>
));
Button.displayName = "Button";

export const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={className}>{children}</div>;

export const CardHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={className}>{children}</div>;

export const CardContent = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={className}>{children}</div>;

export const CardFooter = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={className}>{children}</div>;

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => <input ref={ref} {...props} />);
Input.displayName = "Input";

export const Label = ({
  children,
  htmlFor,
  className,
}: {
  children?: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) => (
  <label htmlFor={htmlFor} className={className}>
    {children}
  </label>
);

export const Skeleton = ({
  className,
}: {
  className?: string;
}) => <div className={className} data-slot="skeleton" />;

export const Select = ({
  children,
  value,
  onValueChange,
}: {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (v: string) => void;
}) => (
  <select
    value={value}
    onChange={(e) => onValueChange?.(e.target.value)}
    data-slot="select"
  >
    {children}
  </select>
);

export const SelectTrigger = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={className}>{children}</div>;

export const SelectValue = ({
  placeholder,
}: {
  placeholder?: string;
}) => <span>{placeholder}</span>;

export const SelectContent = ({
  children,
}: {
  children: React.ReactNode;
}) => <div data-slot="select-content">{children}</div>;

export const SelectItem = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: string;
}) => <option value={value}>{children}</option>;

export const Tabs = ({
  children,
  defaultValue,
  value,
  onValueChange,
}: {
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
}) => {
  const [active, setActive] = React.useState(value ?? defaultValue ?? "");
  const actualValue = value ?? active;
  return (
    <div data-slot="tabs" data-value={actualValue}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        const childProps = child.props as Record<string, unknown>;
        if (childProps.value === "calendar" || childProps.value === "list") {
          return React.cloneElement(child, {
            ...childProps,
            _activeTab: actualValue,
            _setTab: (v: string) => {
              setActive(v);
              onValueChange?.(v);
            },
          } as Record<string, unknown>);
        }
        return child;
      })}
    </div>
  );
};

export const TabsList = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={className}>{children}</div>;

export const TabsTrigger = ({
  children,
  value,
  _activeTab,
  _setTab,
}: {
  children: React.ReactNode;
  value: string;
  _activeTab?: string;
  _setTab?: (v: string) => void;
}) => (
  <button
    data-state={_activeTab === value ? "active" : "inactive"}
    onClick={() => _setTab?.(value)}
  >
    {children}
  </button>
);

export const TabsContent = ({
  children,
  value,
  _activeTab,
}: {
  children: React.ReactNode;
  value: string;
  _activeTab?: string;
}) => {
  if (_activeTab !== value) return null;
  return <div data-slot="tabs-content">{children}</div>;
};

export const Avatar = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={className}>{children}</div>;

export const AvatarFallback = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <span className={className}>{children}</span>;

export const DropdownMenu = ({
  children,
}: {
  children: React.ReactNode;
}) => <div data-slot="dropdown-menu">{children}</div>;

export const DropdownMenuTrigger = ({
  children,
}: {
  children: React.ReactNode;
}) => <>{children}</>;

export const DropdownMenuContent = ({
  children,
}: {
  children: React.ReactNode;
}) => <div data-slot="dropdown-content">{children}</div>;

export const DropdownMenuItem = ({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) => (
  <div onClick={onClick} className={className}>
    {children}
  </div>
);

export const DropdownMenuSeparator = () => <hr />;

export const Sheet = ({
  children,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) => (
  <div data-slot="sheet" data-open={open}>
    {open &&
      React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child, {
          ...(child.props as Record<string, unknown>),
          _onOpenChange: onOpenChange,
        });
      })}
  </div>
);

export const SheetContent = ({
  children,
  side,
  className,
  _onOpenChange,
}: {
  children: React.ReactNode;
  side?: string;
  className?: string;
  _onOpenChange?: (v: boolean) => void;
}) => (
  <div className={className} data-side={side}>
    {React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;
      return React.cloneElement(child, {
        ...(child.props as Record<string, unknown>),
        _onOpenChange,
      });
    })}
  </div>
);

export const Alert = ({
  children,
  variant,
  className,
}: {
  children: React.ReactNode;
  variant?: string;
  className?: string;
}) => (
  <div className={className} data-variant={variant}>
    {children}
  </div>
);

export const AlertDescription = ({
  children,
}: {
  children: React.ReactNode;
}) => <div>{children}</div>;

export const Separator = ({
  className,
}: {
  className?: string;
}) => <hr className={className} />;

export const Switch = ({
  checked,
  onCheckedChange,
}: {
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
}) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange?.(!checked)}
  />
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>((props, ref) => <textarea ref={ref} {...props} />);
Textarea.displayName = "Textarea";

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => <input ref={ref} type="checkbox" {...props} />);
Checkbox.displayName = "Checkbox";
