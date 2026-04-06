import React from "react";

type Props = {
  title: string;
  children: React.ReactNode;
};

export function AuthShell({ title, children }: Props) {
  return (
    <div className="flex justify-center items-center min-h-screen w-full bg-[#0f0f10] text-white">

      <div className="relative flex w-full max-w-[1300px] items-center px-[16px] justify-between">
        <div className="w-full max-w-[520px] p-[24px]">
          <h1 className="mb-6 text-center text-3xl font-medium tracking-wide">
            {title}
          </h1>

          <div className="rounded-[28px] bg-white/10 p-8 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
            {children}
          </div>

          <p className="mt-5 text-center text-[11px] leading-4 text-white/50">
            Продолжая, вы соглашаетесь
            <br />
            с{" "}
            <a className="underline underline-offset-2 hover:text-white" href="#">
              условиями использования приложения
            </a>
          </p>
        </div>

        <div className="flex p-[24px]">
            <img className="w-full h-full p-0 m-0 bg-cover bg-no-repeat bg-center" src="/board.png" />
        </div>
      </div>
    </div>
  );
}
