export default function LoadingState({ label = 'Loading data' }) {
  return (
    <div className="w-full flex items-center justify-center py-16">
      <div className="bg-white shadow-lg rounded-2xl px-6 py-5 flex items-center gap-4 border border-blue-100">
        <div className="h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        <div>
          <p className="text-gray-900 font-semibold">{label}</p>
          <p className="text-gray-500 text-sm animate-pulse">Please wait...</p>
        </div>
      </div>
    </div>
  );
}
