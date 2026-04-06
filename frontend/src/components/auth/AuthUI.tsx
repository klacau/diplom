import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function AuthInput({ label, className = "", ...props }: InputProps) {
  return (
    <div className="w-full">
      {label ? (
        <div className="mb-2 text-sm text-white/70">{label}</div>
      ) : null}
      <input
        className={
          "h-12 w-full rounded-2xl bg-white/85 px-4 text-[15px] text-black placeholder:text-black/45 outline-none ring-0 focus:bg-white " +
          className
        }
        {...props}
      />
    </div>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "dark" | "light";
};

export function AuthButton({
  variant = "dark",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "h-12 w-full rounded-2xl text-[15px] font-medium transition disabled:opacity-60 disabled:cursor-not-allowed";
  const dark = "bg-black/90 text-white hover:bg-black";
  const light = "bg-white/85 text-black hover:bg-white";

  return (
    <button
      className={`${base} ${variant === "dark" ? dark : light} ${className}`}
      {...props}
    />
  );
}

export function AuthError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-sm text-red-200">
      {message}
    </div>
  );
}
