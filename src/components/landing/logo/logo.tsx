import Link from 'next/link';

const Logo = ({ text = false }: { text?: boolean }) => {
  return (
    <Link href={'/'} className="flex w-full items-center gap-2">
      <img
        src="/pivot-logo.svg"
        alt="Pivot Logo"
        className="size-10 object-contain"
      />
      {text && (
        <p
          className={`w-full bg-gradient-to-b from-blue-400 to-blue-700 bg-clip-text text-xl font-black tracking-tighter text-transparent md:text-2xl`}
        >
          Pivot
        </p>
      )}
    </Link>
  );
};

export default Logo;
