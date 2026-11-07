import { PageLayout } from "../../components/PageLayout.tsx";
import CountdownTimer from "../../components/CountdownTimer.tsx";

export default function TimerPage() {
  return (
    <PageLayout
      title="Countdown Timer"
      subtitle="Set minutes and seconds, then start the countdown"
      wide
    >
      <CountdownTimer />
    </PageLayout>
  );
}
