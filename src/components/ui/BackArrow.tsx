import { useRouter } from 'next/router';

const BackArrow = ({ href }: { href?: string }) => {
  const router = useRouter();

  const handleBack = () => {
    if (href) {
      router.push(href); // Navigate to a specific route if `href` is provided
    } else {
      router.back(); // Go back to the previous page if no `href` is provided
    }
  };

  return (
    <button
      onClick={handleBack}
      className="flex items-center text-base-100 hover:text-base-300 py-6"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-5 h-5 mr-2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>
  );
};

export default BackArrow;
