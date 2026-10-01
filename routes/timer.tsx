import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { PageLayout } from "../components/PageLayout.tsx";
import CountdownTimer from "../islands/CountdownTimer.tsx";

export default define.page(function TimerPage() {
  return (
    <>
      <Head>
        <title>Countdown Timer - sl-utils 🛠️</title>
        <meta
          name="description"
          content="A simple countdown timer with minutes and seconds"
        />
      </Head>

      <PageLayout
        title="Countdown Timer"
        subtitle="Set minutes and seconds, then start the countdown"
        wide
      >
        <CountdownTimer />
      </PageLayout>
    </>
  );
});
