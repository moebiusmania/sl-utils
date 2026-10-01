import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import NotesEditor from "../islands/NotesEditor.tsx";

export default define.page(function NotesPage() {
  return (
    <>
      <Head>
        <title>Notes - sl-utils 🛠️</title>
        <meta
          name="description"
          content="A simple full-page notes editor with local storage"
        />
      </Head>

      <main>
        <NotesEditor />
      </main>
    </>
  );
});
