import { cva } from "class-variance-authority";
import { cn } from "../../utils/cn";

const buttonVariants = cva("rounded-full font-bold focus:outline-none transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed", {
  variants: {
    variant: {
      default:
        "bg-black text-white hover:bg-gray-900 focus:bg-gray-900 disabled:hover:bg-black",
      outline:
        "border border-[#F05E1D] text-[#F05E1D] hover:bg-[#F05E1D]/10 disabled:hover:bg-transparent",
      full:
        "bg-[#F05E1D] text-white hover:bg-[#F05E1D]/90",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 px-3",
      lg: "h-11 px-8",
      xl: "h-14 px-8 text-lg",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

// Interface simplifiée avec uniquement les props nécessaires

interface ButtonPropsCVA {
  variant?: "default" | "outline" | "full";
  size?: "default" | "sm" | "lg" | "xl";
  className?: string;
}

interface ButtonPropsdata {
  children?: React.ReactNode;
}

interface ButtonPropsLogic {
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

type ButtonProps = ButtonPropsCVA & ButtonPropsdata & ButtonPropsLogic;

export default function Button({
  variant,
  size,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}