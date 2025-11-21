import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-black">
      <div className="w-full max-w-md mx-auto px-6 py-10 bg-white dark:bg-zinc-900 rounded-2xl shadow-md flex flex-col items-center gap-8">
        <Image
          src="/logo.png"
          alt="Logo"
          width={80}
          height={80}
          className="rounded-xl"
        />

        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 text-center">
          Sistema de Comandas
        </h1>

        <p className="text-center text-zinc-600 dark:text-zinc-400 text-base leading-relaxed">
          Administra pedidos, mesas y el flujo completo de tu negocio de forma
          rápida y moderna.  
        </p>

        <div className="flex flex-col w-full gap-4 mt-4">
          <a
            href="/login"
            className="w-full py-3 rounded-xl bg-zinc-900 text-white text-center font-medium hover:bg-zinc-700 transition"
          >
            Entrar al Panel
          </a>

        </div>
      </div>
    </div>
  );
}

