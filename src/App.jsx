import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Landing from "./components/Landing";
import AuthForm from "./components/AuthForm";
import Home from "./components/Home";
import Admin from "./components/Admin";

const getRoute = () => (window.location.pathname.replace(/\/+$/, "").endsWith("/admin") || window.location.hash.startsWith("#/admin") ? "admin" : "app");

export default function App() {
  const [route, setRoute] = useState(getRoute());
  const [user, setUser] = useState(undefined); // undefined = still loading
  const [page, setPage] = useState("landing");
  const [notice, setNotice] = useState("");
  const lock = useRef(false); // true while sign-up is in progress, so Home does not flash

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        if (u && lock.current) return;
        setUser(u);
      }),
    []
  );

  const go = (next, msg = "") => {
    setPage(next);
    setNotice(msg);
    window.scrollTo(0, 0);
  };

  if (route === "admin") return <Admin />;
  if (user === undefined) return <div className="grid min-h-screen place-items-center text-ink/60">Loading...</div>;
  if (user) return <Home user={user} />;
  if (page === "landing") return <Landing go={go} />;
  return <AuthForm mode={page} go={go} lock={lock} notice={notice} />;
}
