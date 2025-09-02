// src/App.js
import React, { useState } from "react";
import AdminPage from "./AdminPage";
import CustomerPage from "./CustomerPage";
import "./AdminPage.css";
import "./CustomerPage.css";

function App() {
  const [isAdmin, setIsAdmin] = useState(true);

  return (
    <div className="App">
      {isAdmin ? (
        <AdminPage onSwitch={() => setIsAdmin(false)} />
      ) : (
        <CustomerPage onSwitch={() => setIsAdmin(true)} />
      )}
    </div>
  );
}

export default App;
