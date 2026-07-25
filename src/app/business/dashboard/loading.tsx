export default function BusinessDashboardLoading() {
  return <main className="mx-auto w-full max-w-6xl p-6" aria-busy="true" aria-label="Loading business dashboard"><div className="skeleton h-7 w-48 rounded"/><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({length:4},(_,index)=><div key={index} className="skeleton h-32 rounded-2xl"/>)}</div><div className="mt-6 skeleton h-64 rounded-2xl"/></main>;
}
