export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Privacy policy</h1>
      <p className="mt-4">
        Refresh Schedule, provided by Analyticsaura, lets you view Power BI
        dataset refresh schedules and history inside Microsoft Teams.
      </p>
      <h2 className="mt-6 text-lg font-semibold">What we access</h2>
      <p className="mt-2">
        When you open the app, Microsoft Teams signs you in. The app then calls
        Power BI on your behalf to read the workspaces and datasets you can
        already access, along with their refresh history and schedules. If you
        choose, it can also start a refresh or change a schedule.
      </p>
      <h2 className="mt-6 text-lg font-semibold">What we store</h2>
      <p className="mt-2">
        The app does not keep a database of your data. Information from Power BI
        is shown to you and is not saved by the app.
      </p>
      <h2 className="mt-6 text-lg font-semibold">Contact</h2>
      <p className="mt-2">Questions: [sathishs@analyticsaura]</p>
    </main>
  );
}