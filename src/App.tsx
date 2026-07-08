import { useState } from "react";
import "./App.css";

function App() {
  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>): void {
    const files = event.target.files;
    if (!files?.[0]) return;
    console.log("files:", files);
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (!event?.target?.result) return;
      const text = event.target.result;
      console.log(text);
      // alert(text);
    };
    reader.readAsText(files[0]);
  }

  return (
    <>
      <section id="center">
        <h1>Kanban</h1>
        <label htmlFor="file-input">Select Kanban file</label>
        <input id="file-input" type="file" onChange={handleFileSelect} />
      </section>
    </>
  );
}

export default App;
