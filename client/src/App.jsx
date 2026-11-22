import lostFoundImage from "../../css/artwork/lost.jpg";
import supportImage from "../../css/artwork/reports.jpg";
import classImage from "../../css/artwork/community.jpg";
import examImage from "../../css/artwork/exams.jpg";
import campusImage from "../../css/artwork/campus.jpg";
import campusIcons from "../../css/campus-icons.svg?no-inline";
import { io } from "socket.io-client";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { api, API_URL, json } from "./lib/api";

/* ─── Constants ─────────────────────────────── */
const modules = [
  {path:"/lost-found",image:lostFoundImage,alt:"Backpack, water bottle and keys",title:"Lost & Found",description:"Check found items, post lost items and verify ownership."},
  {path:"/reports",image:supportImage,alt:"Maintenance checklist and safety cone",title:"Smart Campus",description:"Report maintenance and safety issues and track progress."},
  {path:"/community",image:classImage,alt:"Class notebooks and discussion bubbles",title:"ClassSpace",description:"Class groups, announcements, notes and assignments."},
  {path:"/examinations",image:examImage,alt:"Exam calendar, clock and pencil",title:"Examinations",description:"Exam timetable, seating plans, teacher duties and requests."}
];
const roleOf = u => u?.role || "Student";
const isAdmin = u => roleOf(u) === "Admin";
const isTeacher = u => roleOf(u) === "Teacher";
const isStaff = u => ["Teacher","Admin"].includes(roleOf(u));
const identityOf = (u) =>
  String(u?.role || "").startsWith("Student")
    ? (u?.rollNumber || "Roll number not set")
    : (u?.email || "Email not available");

/* ─── Shell / Navigation ─────────────────────── */
const destinations = {
  "/": ["Home", "dashboard"], "/dashboard": ["Dashboard", "dashboard"],
  "/lost-found": ["Lost & Found", "box"], "/reports": ["Reports", "reports"],
  "/community": ["ClassSpace", "community"], "/examinations": ["Exams", "exams"],
  "/users": ["Users & roles", "users"], "/profile": ["Profile", "profile"],
  "/help": ["Help & support", "help"], "/about": ["About", "campus"],
  "/contact": ["Contact", "contact"], "/register-campus": ["Register campus", "campus"],
  "/login": ["Log in", "login"], "/security": ["Security", "security"],
  "/data": ["Data & backup", "data"]
};

function Icon({name}) {
  return <svg className="icon" aria-hidden="true"><use href={campusIcons + "#" + name}/></svg>;
}

function Shell({children}) {
  const {user, logout} = useAuth();
  const {pathname} = useLocation();
  const links = user
    ? ["/dashboard", "/lost-found", "/reports", "/community", "/examinations", ...(isAdmin(user) ? ["/users", "/security", "/data"] : []), "/profile", "/help"]
    : ["/", "/about", "/contact", "/help", "/register-campus", "/login"];
  return <>
    <header className="campus-rail"><div className="bar">
      <Link className="brand" to={user ? "/dashboard" : "/"}>
        <Icon name="campus"/><span>CampusCare<small>{user?.campusName || "Smart Campus"}</small></span>
      </Link>
      <nav aria-label="Main navigation">{links.map(path => {
        const [label, icon] = destinations[path];
        return <Link key={path} to={path} className={pathname === path ? "on" : ""} aria-current={pathname === path ? "page" : undefined}><Icon name={icon}/>{label}</Link>;
      })}{user && <button className="nav-logout" onClick={logout}><Icon name="login"/>Log out</button>}</nav>
      <div className="rail-landscape" aria-hidden="true"/>
    </div></header>
    <main>{children}</main>
    {!user && <footer><div className="wrap"><b>CampusCare</b><div><Link to="/about">About</Link><Link to="/contact">Contact</Link></div></div></footer>}
  </>;
}

function Page({title, subtitle, action, children}) {
  const {pathname} = useLocation();
  const icon = destinations[pathname]?.[1] || "campus";
  return <div className="wrap page-content"><div className="page-heading">
    <span className={"icon-tile tile-" + icon}><Icon name={icon}/></span>
    <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}
  </div>{children}</div>;
}
function Notice({text,type="error"}){return text?<p className={type==="success"?"auth-message success-msg":"auth-message"} role="alert">{text}</p>:null}
function SearchBox({value,onChange,placeholder="Search..."}){
  return <div className="search-wrap"><Icon name="search"/><input type="search" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}/></div>;
}
function Badge({text}){
  const colors={default:"#666",Submitted:"#805500",Open:"#096953","Under Review":"#1a6fa8",Assigned:"#1a6fa8","In Progress":"#9b4a00","Claim Pending":"#9b4a00",Resolved:"#1a7a3a",Rejected:"#b42318","active":"#1a7a3a","suspended":"#b42318","provisioning":"#9b4a00"};
  return <span className="tag" style={{"--status-color":colors[text]||"#516482"}}>{text}</span>;
}

/* ─── Route Guards ───────────────────────────── */
function Protected({children,roles}){
  const {token,user,ready}=useAuth();
  if(!ready)return <div className="wrap page-content">Loading account...</div>;
  if(!token||!user)return <Navigate to="/login" replace/>;
  if(roles&&!roles.includes(roleOf(user)))return <div className="wrap page-content"><h2>Access restricted</h2><p>Your account does not have permission to view this page.</p></div>;
  return children;
}

/* ─── Public Pages ───────────────────────────── */
function Home(){const {user}=useAuth();if(user)return <Navigate to="/dashboard" replace/>;return <>
  <section className="hv"><div className="wrap hvi"><div><h1>One campus.<br/>Everything in order.</h1><p>Lost belongings, campus issues, class groups and exams, managed in one calm place for students, teachers and the admin office.</p>
  <div className="row" style={{gap:10,flexWrap:"wrap"}}>
    <Link className="btn w" to="/login">Log in</Link>
    <Link className="btn wg" to="/register-campus">Register Campus</Link>
    </div></div>
  <img className="home-campus-image" src={campusImage} alt="University courtyard and clock tower"/></div></section>
  <section className="wrap lst">{modules.map(m=><Link className="ln" to="/login" key={m.path}><img className="service-cover" src={m.image} alt={m.alt}/><h3>{m.title}</h3><p>{m.description}</p></Link>)}</section>
  <section className="band"><div className="wrap cols"><div><h3>Students</h3><p>Post and track your own items and reports, join class groups and check your exam seat.</p></div><div><h3>Teachers</h3><p>Verify lost and found claims, manage class learning spaces and view assigned exam duties.</p></div><div><h3>Admin office</h3><p>Manage users, reports, exams, class communities and account access.</p></div></div></section>
</>}
function About(){return <div className="wrap page-content"><h2>About CampusCare</h2><div className="two"><div className="card"><p>CampusCare brings everyday campus services into one organised platform.</p><p>It combines Lost & Found, campus issue reporting, class communities and examination management in one place.</p></div><div className="card"><h3>Role-based access</h3><p className="mut"><b>Students:</b> post items and reports, participate in class groups and view their exam details.<br/><b>Teachers:</b> verify claims, manage assigned classes and view exam duties.<br/><b>Admin:</b> manage users, reports, exams and platform operations.</p></div></div></div>}
function Contact(){const [form,setForm]=useState({name:"",email:"",message:""});const [msg,setMsg]=useState("");const [busy,setBusy]=useState(false);async function submit(e){e.preventDefault();setBusy(true);setMsg("");try{await api("/api/contact",{method:"POST",body:json(form)});setMsg("Message sent successfully.");setForm({name:"",email:"",message:""});}catch(x){setMsg(x.message)}finally{setBusy(false)}}return <div className="wrap page-content"><h2>Contact us</h2><div className="two"><form className="card" onSubmit={submit}><h3>Send a message</h3><label>Your name</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><label>Email</label><input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><label>Message</label><textarea rows="4" required value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/><p><button className="btn" disabled={busy}>{busy?"Sending...":"Send message"}</button></p>{msg&&<p className="mut">{msg}</p>}</form><div className="card"><h3>Campus support</h3><p>Phone: <a href="tel:+911412000000">0141 200 0000</a><br/>Hours: Mon to Sat, 9 AM to 5 PM<br/>Office: Admin block, ground floor</p></div></div></div>}
function Help(){return <div className="wrap page-content"><h2>Help & Support</h2><div className="two"><div className="card"><h3>Getting started</h3><p>Log in with your campus email and password. Your campus code or the university-specific URL will direct you to the right campus workspace.</p><h3>Modules</h3><ul style={{paddingLeft:20,color:"var(--mu)"}}><li><b>Lost & Found:</b> Post lost/found items and submit claims to retrieve belongings.</li><li><b>Campus Reports:</b> Report maintenance, safety or cleanliness issues and track their status.</li><li><b>Community:</b> Access class-specific groups for notes, assignments and discussions.</li><li><b>Examinations:</b> View your exam schedule, seating plan and submit correction requests.</li></ul></div><div className="card"><h3>Role guide</h3><p><b>Student:</b> view personal data, submit reports, access joined communities, use Lost & Found.</p><p><b>Student CR:</b> same as Student, plus add students to class communities and post Notes/Discussions.</p><p><b>Teacher:</b> create/manage communities, post all content types, view exam duties.</p><p><b>Admin:</b> manage campus users, reports, examinations, and view announcements across all communities.</p><h3>Contact admin</h3><p>For account issues, contact your campus administrator. For platform issues, use the Contact page.</p></div></div></div>}
function Login({ defaultTab = "login" }){
  const nav = useNavigate();
  const { login, user } = useAuth();
  const [tab, setTab] = useState(defaultTab);
  const [campuses, setCampuses] = useState([]);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    fetch(`${API_URL}/api/platform/campuses/public`)
      .then(r => r.json())
      .then(d => { if (d.campuses) setCampuses(d.campuses); })
      .catch(() => {});
  }, []);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [campus, setCampus] = useState(sessionStorage.getItem("campuscare_campus_slug") || "");
  const [show, setShow] = useState(false);

  // Student register state
  const [userForm, setUserForm] = useState({
    campus: sessionStorage.getItem("campuscare_campus_slug") || "",
    name: "",
    email: "",
    password: "",
    year: 1,
    className: "",
    section: "",
    rollNumber: ""
  });

  // Campus register state
  const [campusForm, setCampusForm] = useState({
    institutionName: "",
    name: "",
    slug: "",
    primaryDomain: "",
    adminName: "",
    adminEmail: "",
    adminPassword: ""
  });

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function submitLogin(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const slug = campus.trim().toLowerCase();
      if (slug) sessionStorage.setItem("campuscare_campus_slug", slug);
      const d = await api("/api/auth/login", {
        method: "POST",
        headers: slug ? { "X-Campus-Slug": slug } : {},
        body: json({ email, password, campusSlug: slug })
      });
      login(d.token, d.user);
      nav("/dashboard");
    } catch (x) {
      setMsg(x.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitUserRegister(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const slug = userForm.campus.trim().toLowerCase();
      if (!slug) throw new Error("Please select or enter your campus code.");
      sessionStorage.setItem("campuscare_campus_slug", slug);
      const d = await api("/api/auth/register", {
        method: "POST",
        headers: { "X-Campus-Slug": slug },
        body: json({
          campusSlug: slug,
          name: userForm.name,
          email: userForm.email,
          password: userForm.password,
          year: Number(userForm.year || 1),
          className: userForm.className,
          section: userForm.section,
          rollNumber: userForm.rollNumber
        })
      });
      login(d.token, d.user);
      nav("/dashboard");
    } catch (x) {
      setMsg(x.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitCampusRegister(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const slug = campusForm.slug.trim().toLowerCase();
      if (!slug) throw new Error("Campus code is required.");
      const res = await fetch(`${API_URL}/api/platform/campuses/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...campusForm, slug })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Failed to register campus");
      sessionStorage.setItem("campuscare_campus_slug", d.campus.slug);
      login(d.token, d.user);
      nav("/dashboard");
    } catch (x) {
      setMsg(x.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap page-content">
      <div className="auth-panel"><span className="icon-tile"><Icon name="campus"/></span>
        <h2>Welcome to CampusCare</h2>
        <div className="tabs" style={{ marginBottom: 18 }}>
          <button type="button" className={tab === "login" ? "on" : ""} onClick={() => { setTab("login"); setMsg(""); }}>Log in</button>
          <button type="button" className={tab === "campus" ? "on" : ""} onClick={() => { setTab("campus"); setMsg(""); }}>Register Campus</button>
        </div>

        {tab === "login" && (
          <form className="card" onSubmit={submitLogin}>
            <h3>Campus account</h3>
            {campuses.length > 0 && (
              <div>
                <label>Select university / campus</label>
                <select value={campus} onChange={e => setCampus(e.target.value)}>
                  <option value="">-- Choose your campus (or enter code below) --</option>
                  {campuses.map(c => <option key={c.slug} value={c.slug}>{c.institutionName} ({c.slug})</option>)}
                </select>
              </div>
            )}
            <label>Campus code <span className="mut">(e.g. skit)</span></label>
            <input placeholder="e.g. skit" value={campus} onChange={e => setCampus(e.target.value)} />
            <label>Official campus email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
            <label>Password</label>
            <div className="password-wrap">
              <input type={show ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" className="password-toggle" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
            </div>
            <p><button className="btn" disabled={busy}>{busy ? "Please wait..." : "Log in"}</button></p>
            <Notice text={msg} />
            <div className="mut" style={{ fontSize: 13, marginTop: 16, lineHeight: 1.8 }}>
              New university? <button type="button" style={{ background: "none", border: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", padding: 0, font: "inherit" }} onClick={() => { setTab("campus"); setMsg(""); }}>Register new campus</button>
            </div>
          </form>
        )}

        {tab === "user" && (
          <form className="card" onSubmit={submitUserRegister}>
            <h3>Student Registration</h3>
            <p className="mut" style={{ fontSize: 14 }}>Create a new student account inside your university's campus environment.</p>
            {campuses.length > 0 && (
              <div>
                <label>Select university / campus</label>
                <select value={userForm.campus} onChange={e => setUserForm({ ...userForm, campus: e.target.value })}>
                  <option value="">-- Choose your campus (or enter code below) --</option>
                  {campuses.map(c => <option key={c.slug} value={c.slug}>{c.institutionName} ({c.slug})</option>)}
                </select>
              </div>
            )}
            <label>Campus code <span className="mut">(e.g. skit)</span></label>
            <input required placeholder="e.g. skit" value={userForm.campus} onChange={e => setUserForm({ ...userForm, campus: e.target.value })} />
            <label>Full name</label>
            <input required placeholder="Your full name" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
            <label>Campus email</label>
            <input type="email" required placeholder="your.name@campus.edu" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
            <label>Password (min. 8 characters)</label>
            <input type="password" required minLength={8} placeholder="Password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
            <label>Academic Year</label>
            <select value={userForm.year} onChange={e => setUserForm({ ...userForm, year: Number(e.target.value) })}>
              {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}{y === 1 ? "st" : y === 2 ? "nd" : y === 3 ? "rd" : "th"} Year</option>)}
            </select>
            <label>Course / Program <span className="mut">(e.g. BTech CSE)</span></label>
            <input placeholder="e.g. BTech CSE" value={userForm.className} onChange={e => setUserForm({ ...userForm, className: e.target.value })} />
            <label>Section <span className="mut">(e.g. A)</span></label>
            <input placeholder="e.g. A" value={userForm.section} onChange={e => setUserForm({ ...userForm, section: e.target.value })} />
            <label>Roll number</label>
            <input placeholder="e.g. 23045" value={userForm.rollNumber} onChange={e => setUserForm({ ...userForm, rollNumber: e.target.value })} />
            <p><button className="btn" disabled={busy}>{busy ? "Creating account..." : "Register Account"}</button></p>
            <Notice text={msg} />
            <p className="mut" style={{ fontSize: 13 }}>Already have an account? <button type="button" style={{ background: "none", border: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", padding: 0, font: "inherit" }} onClick={() => { setTab("login"); setMsg(""); }}>Log in here</button></p>
          </form>
        )}

        {tab === "campus" && (
          <form className="card" onSubmit={submitCampusRegister}>
            <h3>Register New University Campus</h3>
            <p className="mut" style={{ fontSize: 14 }}>Onboard your university or college onto CampusCare. An independent tenant environment with isolated database and full administrative control will be created.</p>
            <label>University / Institution name</label>
            <input required placeholder="e.g. Swami Keshvanand Institute of Technology" value={campusForm.institutionName} onChange={e => setCampusForm({ ...campusForm, institutionName: e.target.value })} />
            <label>Campus display name</label>
            <input required placeholder="e.g. SKIT Jaipur" value={campusForm.name} onChange={e => setCampusForm({ ...campusForm, name: e.target.value })} />
            <label>Unique campus code / slug <span className="mut">(lowercase, hyphens only)</span></label>
            <input required placeholder="e.g. skit or manipal-jaipur" value={campusForm.slug} onChange={e => setCampusForm({ ...campusForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} />
            <label>Primary custom domain <span className="mut">(optional)</span></label>
            <input placeholder="e.g. portal.skit.ac.in" value={campusForm.primaryDomain} onChange={e => setCampusForm({ ...campusForm, primaryDomain: e.target.value })} />
            <div className="subtle-divider" style={{ margin: "20px 0" }} />
            <h3>Campus Administrator Account</h3>
            <p className="mut" style={{ fontSize: 13 }}>This administrator will manage students, teachers, reports, exams and academic structure for this campus.</p>
            <label>Administrator full name</label>
            <input required placeholder="e.g. Dr. Ramesh Sharma" value={campusForm.adminName} onChange={e => setCampusForm({ ...campusForm, adminName: e.target.value })} />
            <label>Administrator official email</label>
            <input type="email" required placeholder="admin@skit.ac.in" value={campusForm.adminEmail} onChange={e => setCampusForm({ ...campusForm, adminEmail: e.target.value })} />
            <label>Administrator password <span className="mut">(min. 8 characters)</span></label>
            <input type="password" required minLength={8} placeholder="Secure password" value={campusForm.adminPassword} onChange={e => setCampusForm({ ...campusForm, adminPassword: e.target.value })} />
            <p><button className="btn" disabled={busy}>{busy ? "Registering campus..." : "Register & Create Campus"}</button></p>
            <Notice text={msg} />
            <p className="mut" style={{ fontSize: 13 }}>Already have a campus registered? <button type="button" style={{ background: "none", border: 0, color: "inherit", textDecoration: "underline", cursor: "pointer", padding: 0, font: "inherit" }} onClick={() => { setTab("login"); setMsg(""); }}>Log in here</button></p>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── Dashboard ──────────────────────────────── */
function CampusBadges() {
  const badges = [["star","Campus Helper"],["parcel","Lost & Found Hero"],["book","Study Contributor"],["heart","Active Member"]];
  return <section className="card campus-badges" aria-label="Campus badges">
    <div className="rewards-art" role="img" aria-label="Gold trophy with four campus service medals"/>
    <div className="badge-collection"><h2>Campus badges</h2><ul>
      {badges.map(([design, label]) => <li key={design}><span aria-hidden="true" className={"medal medal-" + design}/>{label}</li>)}
    </ul></div>
  </section>;
}

function Dashboard(){
  const {user}=useAuth();
  const [stats,setStats]=useState(null);const [err,setErr]=useState("");
  useEffect(()=>{
    const endpoint=isAdmin(user)?"/api/dashboard/admin":isTeacher(user)?"/api/dashboard/teacher":"/api/dashboard/student";
    api(endpoint).then(d=>setStats(d.stats)).catch(e=>setErr(e.message));
  },[user]);
return <Page title="Dashboard" subtitle={`Welcome back, ${user?.name || "User"}`}>
        <p className="mut">Signed in as <b>{user.role}</b>{stats&&user.campusName&&<> · {user.campusName}</>}</p>
    <div className="grid dashboard-grid" style={{marginTop:28}}>{modules.map(m=><Link className="card mod" to={m.path} key={m.path}><img className="service-cover" src={m.image} alt={m.alt}/><h3>{m.title}</h3><p>{m.description}</p></Link>)}</div>
    <Notice text={err}/>
    {isAdmin(user)&&stats&&<AdminDashboard stats={stats}/>}
    {isTeacher(user)&&stats&&<TeacherDashboard stats={stats}/>}
    {!isAdmin(user)&&!isTeacher(user)&&stats&&<StudentDashboard stats={stats} user={user}/>}
    {!stats&&!err&&<p className="mut">Loading dashboard...</p>}
    <CampusBadges/>
  </Page>
}
function AdminDashboard({stats}){
  const s=stats;
  return <>
    <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,margin:"18px 0"}}>
      <StatCard label="Students" value={s.users?.students??0}/>
      <StatCard label="Teachers" value={s.users?.teachers??0}/>
      <StatCard label="Student CRs" value={s.users?.crs??0}/>
      <StatCard label="Communities" value={s.communities??0}/>
      <StatCard label="Open Reports" value={s.reports?.open??0}/>
      <StatCard label="Open Lost & Found" value={s.lostFound?.openItems??0}/>
      <StatCard label="Upcoming Exams" value={s.exams?.upcoming??0}/>
    </div>
    {s.recentReports?.length>0&&<div className="card" style={{marginTop:18}}><h3>Recent Reports</h3>{s.recentReports.map(r=><div className="it" key={r._id}><div className="row"><b>{r.reportId} · {r.title}</b><Badge text={r.status}/></div><p className="mut">{r.category} · {r.location} · by {r.reportedBy?.name}</p></div>)}</div>}
    <div className="card dashboard-admin"><h3>Administration</h3><div className="row"><Link className="btn" to="/users">Manage users</Link><Link className="btn" to="/security">Security log</Link><Link className="btn" to="/data">Data & backup</Link></div></div>
  </>;
}
function TeacherDashboard({stats}){
  const s=stats;
  return <>
    <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,margin:"18px 0"}}>
      <StatCard label="My Communities" value={s.communities??0}/>
      <StatCard label="My Reports" value={s.myReports??0}/>
      <StatCard label="Upcoming Duties" value={s.upcomingDuties?.length??0}/>
    </div>
    {s.communityList?.length>0&&<div className="card" style={{marginTop:18}}><h3>My Communities</h3>{s.communityList.map(c=><div className="it" key={c._id}><b>{c.name}</b><p className="mut">Year {c.year} · {c.course} · Section {c.section} · {c.memberCount} members · {c.postCount} posts</p></div>)}</div>}
    {s.upcomingDuties?.length>0&&<div className="card" style={{marginTop:18}}><h3>Upcoming Exam Duties</h3>{s.upcomingDuties.map(d=><div className="it" key={d._id}><b>{d.exam?.subject||"Exam duty"}</b><p className="mut">Year {d.exam?.year} · {d.hall} · {new Date(d.date).toLocaleDateString()} · {d.time}</p></div>)}</div>}
  </>;
}
function StudentDashboard({stats,user}){
  const s=stats;
  return <>
    <div className="grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,margin:"18px 0"}}>
      <StatCard label="My Reports" value={s.myReports??0}/>
      <StatCard label="Open Reports" value={s.openReports??0}/>
      <StatCard label="My Communities" value={s.communities??0}/>
      <StatCard label="My L&F Posts" value={s.myLostFoundPosts??0}/>
    </div>
    <div className="card" style={{marginTop:18}}><h3>Academic Info</h3><p><b>Year:</b> {user.year||"—"} &nbsp;<b>Class:</b> {user.className||"—"} &nbsp;<b>Section:</b> {user.section||"—"} &nbsp;<b>Roll No:</b> {user.rollNumber||"—"}</p></div>
  </>;
}
function StatCard({label,value}){
  return <div className="card stat-card"><span>{label}</span><strong>{value}</strong></div>;
}

/* ─── Profile ────────────────────────────────── */
function Profile(){
  const {user,login,token}=useAuth();
  const [form,setForm]=useState({name:user?.name||"",year:user?.year||1,className:user?.className||"",section:user?.section||""});
  const [pwd,setPwd]=useState({current:"",newPwd:"",confirm:""});
  const [msg,setMsg]=useState("");const [pwdMsg,setPwdMsg]=useState("");const [busy,setBusy]=useState(false);

  async function saveProfile(e){e.preventDefault();setBusy(true);setMsg("");try{
    const isStaffRole = ["Admin", "Teacher"].includes(user?.role);
    const profilePayload = isStaffRole
      ? { name: form.name }
      : {
          name: form.name,
          year: Number(form.year || 1),
          className: form.className,
          section: form.section,
        };
    const d=await api("/api/auth/me",{method:"PATCH",body:json(profilePayload)});
    setMsg("Profile updated successfully.");
    login(token,d.user);
  }catch(x){setMsg(x.message)}finally{setBusy(false)}}

  async function changePassword(e){e.preventDefault();setPwdMsg("");
    if(pwd.newPwd!==pwd.confirm){setPwdMsg("New passwords do not match.");return;}
    if(pwd.newPwd.length<8){setPwdMsg("New password must be at least 8 characters.");return;}
    try{await api("/api/auth/me/password",{method:"PATCH",body:json({currentPassword:pwd.current,newPassword:pwd.newPwd})});
    setPwdMsg("Password changed successfully.");setPwd({current:"",newPwd:"",confirm:""});}catch(x){setPwdMsg(x.message)}}

  return <Page title="My Profile"><div className="two">
    <form className="card" onSubmit={saveProfile}><h3>Edit profile</h3>
      <label>Full name</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
      <label>Email <span className="mut">(cannot be changed here)</span></label><input disabled value={user?.email||""}/>
      <label>Role</label><input disabled value={user?.role||""}/>
      {!["Admin", "Teacher"].includes(user?.role) && <>
        <label>Year</label><select value={form.year} onChange={e=>setForm({...form,year:Number(e.target.value)})}>{[1,2,3,4].map(y=><option key={y} value={y}>Year {y}</option>)}</select>
        <label>Class / Course</label><input value={form.className} onChange={e=>setForm({...form,className:e.target.value})}/>
        <label>Section</label><input value={form.section} onChange={e=>setForm({...form,section:e.target.value})}/>
      </>}
      <p><button className="btn" disabled={busy}>{busy?"Saving...":"Save profile"}</button></p>
      <Notice text={msg} type={msg.includes("success")?"success":"error"}/>
    </form>
    <form className="card" onSubmit={changePassword}><h3>Change password</h3>
      <label>Current password</label><input type="password" required value={pwd.current} onChange={e=>setPwd({...pwd,current:e.target.value})}/>
      <label>New password (min. 8 characters)</label><input type="password" required value={pwd.newPwd} onChange={e=>setPwd({...pwd,newPwd:e.target.value})}/>
      <label>Confirm new password</label><input type="password" required value={pwd.confirm} onChange={e=>setPwd({...pwd,confirm:e.target.value})}/>
      <p><button className="btn">Change password</button></p>
      <Notice text={pwdMsg} type={pwdMsg.includes("success")?"success":"error"}/>
    </form>
  </div></Page>
}

/* ─── Lost & Found ───────────────────────────── */

function getCampusImageHeaders() {
  const headers = new Headers();

  const token = sessionStorage.getItem("campuscare_token");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const hostParts = window.location.hostname.split(".");
  const rootDomain = (
    import.meta.env.VITE_ROOT_DOMAIN || "campuscare.in"
  ).toLowerCase();

  const inferredSlug =
    hostParts.length > 2 &&
    hostParts.slice(-2).join(".") === rootDomain
      ? hostParts[0]
      : "";

  const campusSlug =
    sessionStorage.getItem("campuscare_campus_slug") ||
    inferredSlug;

  if (campusSlug) {
    headers.set("X-Campus-Slug", campusSlug);
  }

  return headers;
}

function ZoomableImage({ src, alt = "Image", className = "" }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!src) return null;

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`zoomable-image ${className}`}
        onClick={() => setIsOpen(true)}
        title="Click to enlarge"
      />

      {isOpen && (
        <div
          className="image-lightbox"
          onClick={() => setIsOpen(false)}
        >
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close image"
          >
            ×
          </button>

          <img
            src={src}
            alt={alt}
            className="lightbox-preview"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}


function SecureImage({ src, alt }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    const id = String(src || "").split("/").filter(Boolean).pop();

    if (!id) {
      setUrl("");
      return;
    }

    setUrl("");

    fetch(`${API_URL}/api/lost-found/images/${encodeURIComponent(id)}`, {
      headers: getCampusImageHeaders(),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Lost & Found image failed: ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;

        if (!blob.type.startsWith("image/")) {
          throw new Error("Server did not return an image");
        }

        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((error) => {
        console.error("Lost & Found image error:", error);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return url ? (
    <ZoomableImage
      src={url}
      alt={alt}
      className="secure-preview-image"
    />
  ) : null;
}


const itemCategories = ["Electronics", "Documents", "Books", "Accessories", "Clothing", "Other"];
function LostFound(){
  const [category, setCategory] = useState("All");
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const {user}=useAuth();
  const [items,setItems]=useState([]);const [tab,setTab]=useState("Lost");const [search,setSearch]=useState("");
  const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const [form,setForm]=useState({title:"",description:"",category:"Other",location:"",date:new Date().toISOString().slice(0,10)});
  const [files,setFiles]=useState([]);const [claim,setClaim]=useState({});const [claims,setClaims]=useState([]);
  const [editId,setEditId]=useState(null);

  async function load(){try{const d=await api(`/api/lost-found?type=${tab}&search=${encodeURIComponent(search)}&limit=50`);setItems(d.items||[])}catch(e){setError(e.message)}}
  useEffect(()=>{load()},[tab]);
  useEffect(()=>{api("/api/lost-found/claims").then(d=>setClaims(d.claims||[])).catch(()=>{})},[items.length]);

  async function post(e){e.preventDefault();const submittedForm=e.currentTarget;setBusy(true);setError("");try{
    const fd=new FormData();
    Object.entries({...form,itemType:tab}).forEach(([k,v])=>fd.append(k,v));
    files.forEach(f=>fd.append("images",f));
    if(editId){await api(`/api/lost-found/${editId}`,{method:"PATCH",body:fd});}
    else{await api("/api/lost-found",{method:"POST",body:fd});}
    setForm({title:"",description:"",category:"Other",location:"",date:new Date().toISOString().slice(0,10)});
    submittedForm.reset();setFiles([]);setEditId(null);setPosting(false);await load();
  }catch(e){setError(e.message)}finally{setBusy(false)}}

  async function markResolved(id){try{await api(`/api/lost-found/${id}/status`,{method:"PATCH",body:json({status:"Resolved"})});await load()}catch(e){setError(e.message)}}



async function sendClaim(id, type = "Ownership") {
  try {
    setBusy(true);
    setError("");

    const fd = new FormData();
    const current = claim[id] || {};

    fd.append("claimType", type);
    fd.append("message", current.message || "");

    if (type === "FoundResponse") {
      fd.append("foundLocation", current.foundLocation || "");
      fd.append("foundDate", current.foundDate || "");
    } else {
      fd.append("proofDescription", current.proof || "");
      (current.files || []).forEach(file => {
        fd.append("proofImages", file);
      });
    }

    await api(`/api/lost-found/${id}/claims`, {
      method: "POST",
      body: fd,
    });

    const data = await api("/api/lost-found/claims");
    setClaims(data.claims || []);

    await load();

    setClaim(prev => ({
      ...prev,
      [id]: {
        message: "",
        proof: "",
        files: [],
        foundLocation: "",
        foundDate: "",
      },
    }));

    setError(
      type === "FoundResponse"
        ? "Your found response has been sent to the item owner."
        : "Your ownership claim has been submitted."
    );
  } catch (e) {
    setError(e.message);
  } finally {
    setBusy(false);
  }
}



  async function review(id,decision){try{
    await api(`/api/lost-found/claims/${id}/review`,{method:"PATCH",body:json({decision,reviewMessage:"Reviewed by campus staff"})});
    const data = await api("/api/lost-found/claims");
    setClaims(data.claims || []);
    await load();
  }catch(e){setError(e.message)}}
  async function deleteItem(id){if(!confirm("Delete this post?"))return;try{await api(`/api/lost-found/${id}`,{method:"DELETE"});await load()}catch(e){setError(e.message)}}

  const isOwner=(i)=>String(i.postedBy?._id||i.postedBy)===String(user.id||user._id);

  const visibleItems = items.filter(item => category === "All" || item.category === category);
  return <Page title="Lost & Found" subtitle="Find what’s lost. Return what’s found."
    action={<button className="btn heading-action" aria-expanded={posting} onClick={()=>setPosting(!posting)}>{posting ? "Browse items" : "Report item"}</button>}>
    <Notice text={error}/>
    <div className="tabs">{["Lost","Found"].map(type=><button key={type} className={tab===type?"on":""} onClick={()=>{setTab(type);setExpanded(null)}}>{type}</button>)}</div>
    <div>
      {!posting && <section className="card item-browser">
        <form className="item-search" onSubmit={e=>{e.preventDefault();load()}}>
          <SearchBox value={search} onChange={setSearch} placeholder="Search by item, location or description"/>
          <button className="btn g" type="submit">Search</button>
        </form>
        <div className="category-list" aria-label="Item category">{["All", ...itemCategories].map(name=>
          <button key={name} data-category={name} aria-pressed={category===name} onClick={()=>setCategory(name)}>{name}</button>)}</div>
        <div className="item-grid">{visibleItems.map(i=><article className="item-card" key={i._id}>
          <div className="item-photo art-box" data-category={i.category}><span className="category-caption">Category illustration</span>{i.images?.[0] && <SecureImage src={i.images[0].url||i.images[0]} alt={i.title}/>}</div>
          <div className="item-info"><h3>{i.title}</h3>
          <p className="item-meta"><Icon name="location"/>{i.location}</p>
          {i.date && <p className="item-meta"><Icon name="exams"/>{new Date(i.date).toLocaleDateString()}</p>}
          <div className="item-actions"><Badge text={i.status}/><button className="btn g s" aria-expanded={expanded===i._id} onClick={()=>setExpanded(expanded===i._id?null:i._id)}>{expanded===i._id?"Hide details":"View details"}</button></div>
          {expanded===i._id && <div className="item-details">
          <p className="mut">{i.category} · {i.itemType}</p><p>{i.description}</p>
          <div className="row">{(i.images||[]).slice(1).map((im,n)=><SecureImage key={n} src={im.url||im} alt={i.title}/>)}</div>
          <p className="mut">Posted by {identityOf(i.postedBy)}</p>
          <div className="row" style={{flexWrap:"wrap",gap:8}}>
            {i.status!=="Resolved"&&(isOwner(i)||isAdmin(user))&&<button className="btn s" onClick={()=>markResolved(i._id)}>Mark resolved</button>}
            {(isOwner(i)||isAdmin(user))&&<button className="btn s g" onClick={()=>deleteItem(i._id)}>Delete</button>}
            {i.itemType==="Found"&&i.status==="Open"&&!isOwner(i)&&<div style={{width:"100%"}}>
              <textarea required placeholder="Describe identifying details / ownership proof" value={claim[i._id]?.proof||""} onChange={e=>setClaim({...claim,[i._id]:{...claim[i._id],proof:e.target.value}})}/>

              <textarea placeholder="I will collect it from you or i can collect it from that place after [time]" value={claim[i._id]?.message||""} onChange={e=>setClaim({...claim,[i._id]:{...claim[i._id],message:e.target.value}})}/>
              <div className="claim-image-upload">
  <label>Upload Ownership Proof (Optional)</label>
  <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    multiple
    onChange={(e) =>
      setClaim((prev) => ({
        ...prev,
        [i._id]: {
          ...prev[i._id],
          files: Array.from(e.target.files || []).slice(0, 3),
        },
      }))
    }
  />
  <small>You can upload up to 3 images (JPG, PNG, WEBP).</small>
</div>
              <button type="button" className="btn s" disabled={busy} onClick={()=>sendClaim(i._id)}>{busy?"Submitting...":"Submit ownership claim"}</button>
            </div>}

{i.itemType === "Lost" && i.status === "Open" && !isOwner(i) && (
  <div style={{ width: "100%", marginTop: 12 }}>
    <h4>I Found This Item</h4>
    <p className="mut">
      Found this belonging? Share where and when you found it.
      The person who posted this Lost item will receive your response.
    </p>

    <input
      placeholder="Where did you find it? (e.g. Library, Block A)"
      value={claim[i._id]?.foundLocation || ""}
      onChange={e =>
        setClaim(prev => ({
          ...prev,
          [i._id]: {
            ...prev[i._id],
            foundLocation: e.target.value
          }
        }))
      }
      required
    />

    <label>When did you find it?</label>
    <input
      type="datetime-local"
      value={claim[i._id]?.foundDate || ""}
      onChange={e =>
        setClaim(prev => ({
          ...prev,
          [i._id]: {
            ...prev[i._id],
            foundDate: e.target.value
          }
        }))
      }
      required
    />

    <textarea
      placeholder="Message: I found this item. You can collect it from..."
      value={claim[i._id]?.message || ""}
      onChange={e =>
        setClaim(prev => ({
          ...prev,
          [i._id]: {
            ...prev[i._id],
            message: e.target.value
          }
        }))
      }
      required
    />

    <button
      type="button"
      className="btn s"
      disabled={busy}
      onClick={() => sendClaim(i._id, "FoundResponse")}
    >
      Send Found Response
    </button>
  </div>
)}

          </div>
          </div>}</div></article>)}</div>
        {!visibleItems.length&&<p className="empty-state item-empty" data-category={category}>No {tab.toLowerCase()} items in this view.</p>}
      </section>}
      <form hidden={!posting} className="card item-form" onSubmit={post}>
        <h3>{editId?"Edit":"Post a"} {tab.toLowerCase()} item</h3>
        <label>Item title</label><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
<label>
  {tab === "Found" ? "Description / Collect It From" : "Description"}
</label>
<textarea
  required
  value={form.description}
  onChange={e=>setForm({...form,description:e.target.value})}
  placeholder={
    tab === "Found"
      ? "Describe the item and mention where and when it can be collected. Example: Collect it from the college reception between 2 PM and 4 PM, and after it collect it from that particular place."
      : ""
  }
/>        <label>Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{itemCategories.map(x=><option key={x}>{x}</option>)}</select>
        <label>Location</label><input required value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/>
        <label>Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
        <label>Photos {editId?"(leave empty to keep existing)":"(required)"}</label><input type="file" accept="image/jpeg,image/png,image/webp" multiple={!editId} required={!editId} onChange={e=>setFiles([...e.target.files])}/>
        <p><button className="btn" disabled={busy}>{busy?"Posting...":`${editId?"Update":"Post"} ${tab} item`}</button>{editId&&<button type="button" className="btn g s" style={{marginLeft:8}} onClick={()=>{setEditId(null);setForm({title:"",description:"",category:"Other",location:"",date:new Date().toISOString().slice(0,10)});setFiles([])}}>Cancel</button>}</p>
        <p className="mut">Upload up to five clear item photos (maximum 5 MB each).</p>
      </form>
    </div>
    {isStaff(user)&&<div className="card" style={{marginTop:18}}><h3>Claim verification</h3>{claims.filter(c=>c.status==="Pending").map(c=><div className="it" key={c._id}><b>{c.item?.title||"Item claim"}</b><p>{identityOf(c.claimedBy)}: {c.message}</p><p className="mut">{c.proofDescription}</p><div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
  {(c.proofImages || []).map((image, index) => (
    <SecureImage
      key={`${c._id}-${index}`}
      src={image}
      alt="Ownership proof"
    />
  ))}
</div><button className="btn s" onClick={()=>review(c._id,"Approved")}>Approve</button> <button className="btn s g" onClick={()=>review(c._id,"Rejected")}>Reject</button></div>)}{!claims.filter(c=>c.status==="Pending").length&&<p className="mut">No pending claims.</p>}</div>}
  </Page>
}

/* ─── Reports ────────────────────────────────── */

/* ─── Reports ────────────────────────────────── */


function SecureReportImage({ src }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    const id = String(src || "").split("/").filter(Boolean).pop();

    if (!id) {
      setUrl("");
      return;
    }

    setUrl("");

    fetch(`${API_URL}/api/reports/images/${encodeURIComponent(id)}`, {
      headers: getCampusImageHeaders(),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Report image failed: ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) return;

        if (!blob.type.startsWith("image/")) {
          throw new Error("Server did not return an image");
        }

        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((error) => {
        console.error("Report image error:", error);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return url ? (
    <ZoomableImage
      src={url}
      alt="Report image"
      className="secure-preview-image"
    />
  ) : null;
}


function Reports() {
  const { user } = useAuth();

  const canViewReports = ["Admin", "Teacher"].includes(user?.role);
  const canManageReports = user?.role === "Admin";

  const [list, setList] = useState([]);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [helpReportId, setHelpReportId] = useState(null);
const [helpMessage, setHelpMessage] = useState("");
const [helpBusy, setHelpBusy] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Maintenance",
    location: "",
    priority: "Medium",
  });

  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);

  const [filterStatus, setFilterStatus] = useState("");
  const [filterCat, setFilterCat] = useState("");

  // Only Admin and Teachers can load the report listing.
  async function load() {
    if (!canViewReports) return;

    try {
      setErr("");

      let url = `/api/reports?limit=50&search=${encodeURIComponent(search)}`;

      if (filterStatus) {
        url += `&status=${encodeURIComponent(filterStatus)}`;
      }

      if (filterCat) {
        url += `&category=${encodeURIComponent(filterCat)}`;
      }

      const data = await api(url);
      setList(data.reports || []);
    } catch (error) {
      setErr(error.message || "Unable to load reports.");
    }
  }

  useEffect(() => {
    if (canViewReports) {
      load();
    } else {
      setList([]);
    }
  }, [canViewReports]);

  // Submit a new report. Available to all campus roles.
  async function create(e) {
    e.preventDefault();

    setBusy(true);
    setErr("");
    setSuccess("");

    try {
      const fd = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        fd.append(key, value);
      });

      files.slice(0, 5).forEach((file) => {
        fd.append("images", file);
      });

      await api("/api/reports", {
        method: "POST",
        body: fd,
      });

      setForm({
        title: "",
        description: "",
        category: "Maintenance",
        location: "",
        priority: "Medium",
      });

      setFiles([]);

      setSuccess(
        "Your report has been submitted successfully!"
      );

      if (canViewReports) {
        await load();
      }
    } catch (error) {
      setErr(error.message || "Failed to submit your report.");
    } finally {
      setBusy(false);
    }
  }

  // Admin-only report status management.
  async function updateStatus(id, status) {
    try {
      setErr("");

      await api(`/api/reports/${id}/status`, {
        method: "PATCH",
        body: json({
          status,
          resolutionNote:
            status === "Resolved"
              ? "Resolved by campus support"
              : "",
        }),
      });

      await load();
    } catch (error) {
      setErr(error.message);
    }
  }

async function submitHelpMessage(id) {
  if (!helpMessage.trim()) {
    setErr("Please enter your observation.");
    return;
  }

  try {
    setHelpBusy(true);
    setErr("");

    await api(`/api/reports/${id}/help`, {
      method: "POST",
      body: json({ message: helpMessage.trim() }),
    });

    setHelpMessage("");
    setHelpReportId(null);
    setSuccess("Your observation has been shared successfully.");

    await load();
  } catch (error) {
    setErr(error.message || "Unable to share your observation.");
  } finally {
    setHelpBusy(false);
  }
}

  // Admin-only department assignment.
  async function assignTeam(id, assignedTeam) {
    try {
      setErr("");

      await api(`/api/reports/${id}/assign-team`, {
        method: "PATCH",
        body: json({ assignedTeam }),
      });

      await load();
    } catch (error) {
      setErr(error.message);
    }
  }

  const filtered = list.filter((report) =>
    [
      report.reportId,
      report.title,
      report.description,
      report.category,
      report.location,
      report.assignedTeam,
      report.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <Page
      title={
        canViewReports
          ? "Campus Support / Reports"
          : "Report an Issue"
      }
    >
      <Notice text={err} />

      {success && (
        <div
          className="success-message"
          role="status"
          style={{
            padding: "14px 16px",
            marginBottom: "16px",
            borderRadius: "6px",
            background: "#e8f7ed",
            color: "#176b36",
          }}
        >
          {success}
        </div>
      )}

      <div className="two">

        {/* Report listing: Admin and Teachers only */}
        {canViewReports && (
          <div className="card">
            <h3>
              {canManageReports
                ? "All Campus Reports"
                : "Campus Reports"}
            </h3>

            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search report ID, issue, category, location or team"
            />

            <div className="filter-row">
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value)
                }
              >
                <option value="">All statuses</option>
                {[
                  "Submitted",
                  "Under Review",
                  "Assigned",
                  "In Progress",
                  "Resolved",
                  "Rejected",
                ].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>

              <select
                value={filterCat}
                onChange={(e) =>
                  setFilterCat(e.target.value)
                }
              >
                <option value="">All categories</option>
                {[
                  "Maintenance",
                  "Electrical",
                  "Cleanliness",
                  "Furniture",
                  "Safety",
                  "Vandalism",
                  "Damage",
                  "Littering",
                  "Other",
                ].map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>

              <button
                type="button"
                className="btn s"
                onClick={load}
              >
                Filter
              </button>

              <span>{filtered.length} reports</span>
            </div>

            {filtered.map((report) => (
              <div className="it" key={report._id}>
                <div className="row">
                  <b>
                    {report.reportId} · {report.title}
                  </b>
                  <Badge text={report.status} />
                </div>

                <p>{report.description}</p>

                <p className="mut">
                  {report.category} · {report.location} ·{" "}
                  {report.priority} · by{" "}
                  {report.reportedBy?.name || "Campus user"}
                </p>

                <p className="team-label">
                  Assigned team:{" "}
                  <b>
                    {report.assignedTeam || "General Support"}
                  </b>
                </p>

                <div className="row">
                  {(report.images || []).map((image, index) => (
                    <SecureReportImage
                      key={index}
                      src={`/api/reports/images/${image}`}
                    />
                  ))}
                </div>

                {/* Teacher can share observations */}
{/* Teacher can share observations */}
{user?.role === "Teacher" && (
  <div style={{ marginTop: 12 }}>
    <button
      type="button"
      className="btn s"
      onClick={() => {
        setHelpReportId(
          helpReportId === report._id ? null : report._id
        );
        setHelpMessage("");
      }}
    >
      I Can Help
    </button>

    {helpReportId === report._id && (
      <div style={{ marginTop: 12 }}>
        <label>Share what you witnessed or how you can help</label>

        <textarea
          rows={3}
          maxLength={1000}
          value={helpMessage}
          onChange={(e) => setHelpMessage(e.target.value)}
          placeholder="I saw something related to this incident..."
        />

        <div className="row" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn s"
            disabled={helpBusy || !helpMessage.trim()}
            onClick={() => submitHelpMessage(report._id)}
          >
            {helpBusy ? "Sending..." : "Send Observation"}
          </button>

          <button
            type="button"
            className="btn s g"
            onClick={() => {
              setHelpReportId(null);
              setHelpMessage("");
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )}
  </div>
)}

{/* Observations visible to Admin and Teachers */}
{["Admin", "Teacher"].includes(user?.role) &&
  (report.helpMessages || []).length > 0 && (
    <div style={{ marginTop: 14 }}>
      <h4>Teacher Observations</h4>

      {report.helpMessages.map((item, index) => (
        <div
          key={item._id || index}
          className="card"
          style={{ marginTop: 10 }}
        >
          <b>{item.teacher?.name || "Teacher"}</b>
          <p>{item.message}</p>
          <small className="mut">
            {new Date(item.createdAt).toLocaleString()}
          </small>
        </div>
      ))}
    </div>
)}


                {/* Only Admin can manage reports */}
                {canManageReports &&
                  report.status !== "Resolved" &&
                  report.status !== "Rejected" && (
                    <>
                      <div className="row">
                        <select
                          aria-label="Assign support department"
                          value={
                            report.assignedTeam ||
                            "General Support"
                          }
                          onChange={(e) =>
                            assignTeam(
                              report._id,
                              e.target.value
                            )
                          }
                        >
                          {[
                            "Maintenance Team",
                            "Electrical Team",
                            "Housekeeping Team",
                            "Furniture Team",
                            "Security Team",
                            "General Support",
                          ].map((team) => (
                            <option key={team}>{team}</option>
                          ))}
                        </select>
                      </div>

                      <div className="row">
                        <button
                          type="button"
                          className="btn s"
                          disabled={
                            report.status === "In Progress"
                          }
                          onClick={() =>
                            updateStatus(
                              report._id,
                              "In Progress"
                            )
                          }
                        >
                          In Progress
                        </button>

                        <button
                          type="button"
                          className="btn s"
                          onClick={() =>
                            updateStatus(
                              report._id,
                              "Resolved"
                            )
                          }
                        >
                          Resolve
                        </button>

                        <button
                          type="button"
                          className="btn s g"
                          onClick={() =>
                            updateStatus(
                              report._id,
                              "Rejected"
                            )
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </>
                  )}

                {(report.status === "Resolved" ||
                  report.status === "Rejected") && (
                  <p className="mut">
                    This report is closed.
                    {report.resolutionNote &&
                      ` Note: ${report.resolutionNote}`}
                  </p>
                )}
              </div>
            ))}

            {!filtered.length && (
              <p className="mut">
                No matching reports found.
              </p>
            )}
          </div>
        )}

        {/* Report submission form: All campus roles */}
        <form className="card" onSubmit={create}>
          <h3>
            {canViewReports
              ? "Submit a New Report"
              : "Report an Issue"}
          </h3>

          <p className="mut">
            Report a campus issue to the administration
            and support team.
          </p>

          <label>Issue title</label>
          <input
            required
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
          />

          <label>Type</label>
          <select
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value })
            }
          >
            {[
              "Maintenance",
              "Electrical",
              "Cleanliness",
              "Furniture",
              "Safety",
              "Vandalism",
              "Damage",
              "Littering",
              "Other",
            ].map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>

          <label>Place</label>
          <input
            required
            value={form.location}
            onChange={(e) =>
              setForm({ ...form, location: e.target.value })
            }
          />

          <label>What happened</label>
          <textarea
            required
            value={form.description}
            onChange={(e) =>
              setForm({
                ...form,
                description: e.target.value,
              })
            }
          />

          <label>Priority</label>
          <select
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: e.target.value })
            }
          >
            {["Low", "Medium", "High", "Urgent"].map(
              (priority) => (
                <option key={priority}>{priority}</option>
              )
            )}
          </select>

          <label>Photos (optional, up to 5)</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) =>
              setFiles(Array.from(e.target.files || []).slice(0, 5))
            }
          />

          {files.length > 0 && (
            <p className="mut">
              {files.length} photo(s) selected
            </p>
          )}

          <p>
            <button
              className="btn"
              disabled={busy}
              type="submit"
            >
              {busy ? "Submitting..." : "Submit Report"}
            </button>
          </p>

          <div className="emergency-box">
            <h3>Need Emergency Help?</h3>
            <p>
              For urgent campus safety or security issues,
              contact campus support directly.
            </p>
            <a
              className="btn"
              href="tel:+911412000000"
            >
              Call Campus Support
            </a>
          </div>
        </form>
      </div>
    </Page>
  );
}


/* ─── Community ──────────────────────────────── */
function Community(){
  const {user,token}=useAuth();
  const [channel, setChannel] = useState("All posts");
  const [groups,setGroups]=useState([]);const [active,setActive]=useState(null);const [err,setErr]=useState("");
  const [name,setName]=useState("");const [communityMeta,setCommunityMeta]=useState({year:1,course:"",section:""});
  const [post,setPost]=useState({type:"Discussion",content:""});const [memberEmail,setMemberEmail]=useState("");
  const [search,setSearch]=useState("");const [activeYear,setActiveYear]=useState(null);
  const [editMode,setEditMode]=useState(false);const [editMeta,setEditMeta]=useState({});

  async function load(){try{const d=await api("/api/communities");setGroups(d.groups||[])}catch(e){setErr(e.message)}}
  useEffect(()=>{load()},[]);

  // Socket.IO realtime
  useEffect(()=>{if(!token||!active?._id)return;
    const socket=io(API_URL,{transports:["websocket"],auth:{token,campusSlug:sessionStorage.getItem("campuscare_campus_slug")||""}});
    socket.on("connect",()=>socket.emit("join-community",active._id));
    socket.on("community-post",payload=>{if(payload.communityId===active._id)api(`/api/communities/${active._id}`).then(d=>setActive(d.group)).catch(()=>{});});
    return()=>socket.disconnect();
  },[token,active?._id]);

  async function create(e){e.preventDefault();try{await api("/api/communities",{method:"POST",body:json({name,...communityMeta})});setName("");setCommunityMeta({year:1,course:"",section:""});load()}catch(e){setErr(e.message)}}
  async function saveEdit(e){e.preventDefault();try{await api(`/api/communities/${active._id}`,{method:"PATCH",body:json(editMeta)});setEditMode(false);const d=await api(`/api/communities/${active._id}`);setActive(d.group);load()}catch(e){setErr(e.message)}}
  async function deleteCommunity(){if(!confirm("Delete this community and all its posts?"))return;try{await api(`/api/communities/${active._id}`,{method:"DELETE"});setActive(null);load()}catch(e){setErr(e.message)}}
  async function addPost(e){e.preventDefault();try{await api(`/api/communities/${active._id}/posts`,{method:"POST",body:json(post)});setPost({type:"Discussion",content:""});const d=await api(`/api/communities/${active._id}`);setActive(d.group)}catch(e){setErr(e.message)}}
  async function open(g){setChannel("All posts");setActive(g);try{const d=await api(`/api/communities/${g._id}`);setActive(d.group)}catch(e){setErr(e.message)}}
  async function join(g){try{const d=await api(`/api/communities/${g._id}/join`,{method:"POST"});setActive(d.group);load()}catch(e){setErr(e.message)}}
  async function addMember(e){e.preventDefault();try{const d=await api(`/api/communities/${active._id}/members`,{method:"POST",body:json({email:memberEmail})});setActive(d.group);setMemberEmail("")}catch(x){setErr(x.message)}}
  async function removeMember(memberId){try{const d=await api(`/api/communities/${active._id}/members/${memberId}`,{method:"DELETE"});setActive(d.group)}catch(x){setErr(x.message)}}

  const isOwner=g=>String(g?.owner?._id||g?.owner)===String(user.id||user._id);
  const isMember=g=>(g?.members||[]).some(m=>String(m._id||m)===String(user.id||user._id));

  // Allowed post types by role
  const postTypes=isAdmin(user)?["Announcement"]:isTeacher(user)?["Announcement","Notes","Assignment","Discussion"]:roleOf(user)==="Student CR"?["Notes","Discussion"]:["Notes","Discussion"];

  const visiblePosts = (active?.posts || []).filter(p =>
    (channel === "All posts" || p.type === channel) &&
    [p.content, p.type, identityOf(p.author)].join(" ").toLowerCase().includes(search.toLowerCase())
  );
  return <Page title="ClassSpace" subtitle="Your class communities, notes and discussions."><Notice text={err}/>
    <SearchBox value={search} onChange={setSearch} placeholder="Search communities, posts or members"/>
    {active ? <>
      <button className="btn g s" onClick={()=>{setActive(null);setEditMode(false)}}>← All communities</button>
      {editMode&&isTeacher(user)&&isOwner(active)?
        <form className="card" style={{marginTop:16}} onSubmit={saveEdit}><h3>Edit community</h3>
          <label>Name</label><input required value={editMeta.name||active.name} onChange={e=>setEditMeta({...editMeta,name:e.target.value})}/>
          <label>Year</label><select value={editMeta.year||active.year} onChange={e=>setEditMeta({...editMeta,year:Number(e.target.value)})}>{[1,2,3,4].map(y=><option key={y} value={y}>Year {y}</option>)}</select>
          <label>Course</label><input required value={editMeta.course||active.course} onChange={e=>setEditMeta({...editMeta,course:e.target.value})}/>
          <label>Section</label><input required value={editMeta.section||active.section} onChange={e=>setEditMeta({...editMeta,section:e.target.value})}/>
          <div className="row"><button className="btn">Save</button><button type="button" className="btn g s" onClick={()=>setEditMode(false)}>Cancel</button></div>
        </form>:
        <>
          <div className="row" style={{marginTop:20,justifyContent:"space-between"}}>
            <h3>{active.name}</h3>
            <div className="row" style={{gap:8}}>
              {isTeacher(user)&&isOwner(active)&&<><button className="btn s" onClick={()=>{setEditMode(true);setEditMeta({})}}>Edit</button><button className="btn s g" onClick={deleteCommunity}>Delete</button></>}
            </div>
          </div>
          <p className="mut">Year {active.year} · {active.course} · Section {active.section}</p>
        </>
      }
      <div className="community-layout">
        <aside className="card channel-list"><h3>Channels</h3>
          {["All posts","Announcement","Discussion","Assignment","Notes"].map(type =>
            <button key={type} aria-pressed={channel === type} onClick={()=>setChannel(type)}><span aria-hidden="true">#</span>{type}</button>)}
        </aside>
        <div className="card"><h3>{channel === "All posts" ? "Community feed" : channel}</h3>
          {visiblePosts.map(p=><div className="it" key={p._id}><span className="tag">{p.type}</span> <b>{identityOf(p.author)}</b><p>{p.content}</p><p className="mut">{new Date(p.createdAt).toLocaleString()}</p></div>)}
          {!visiblePosts.length&&<p className="mut">No posts in this view.</p>}
          {(isMember(active)||isOwner(active)||isAdmin(user))&&<form onSubmit={addPost}>
            <label>Post type</label>
            <select value={post.type} onChange={e=>setPost({...post,type:e.target.value})}>{postTypes.map(x=><option key={x}>{x}</option>)}</select>
            <label>Message</label><textarea required value={post.content} onChange={e=>setPost({...post,content:e.target.value})}/>
            <p><button className="btn">Publish</button></p>
          </form>}
        </div>
        <div className="card"><h3>Members ({active.members?.length||0})</h3>
          {(active.members||[]).map(m=><div className="row" key={m._id} style={{justifyContent:"space-between"}}>
            <span>{m.name} · {m.role}</span>
            {isTeacher(user)&&isOwner(active)&&String(m._id)!==String(active.owner?._id||active.owner)&&<button className="btn s g" onClick={()=>removeMember(String(m._id))}>Remove</button>}
          </div>)}
          {(isTeacher(user)||roleOf(user)==="Student CR")&&(isOwner(active)||isMember(active))&&<form onSubmit={addMember}><label>Add a student by campus email</label><input type="email" required value={memberEmail} onChange={e=>setMemberEmail(e.target.value)}/><p><button className="btn s">Add student</button></p></form>}
        </div>
      </div>
    </>:<>
      {activeYear===null?<div className="grid">
        {[1,2,3,4].filter(y=>!["Student","Student CR"].includes(roleOf(user))||y===Number(user.year||1)).map(y=><button type="button" className="card community-card" key={y} onClick={()=>setActiveYear(y)}><h3>{y}{y===1?"st":y===2?"nd":y===3?"rd":"th"} Year</h3><p className="mut">{groups.filter(g=>g.year===y).length} communities</p><span>Open year →</span></button>)}
      </div>:<>
        <button className="btn g s" onClick={()=>setActiveYear(null)}>← All years</button>
        <div className="grid">{groups.filter(g=>g.year===activeYear&&(g.name+" "+(g.members||[]).map(m=>m.name).join(" ")).toLowerCase().includes(search.toLowerCase())).map(g=><div className="card community-card" key={g._id}>
          <h3>{g.name}</h3><p className="mut">{g.members?.length||0} members · {g.posts?.length||0} posts</p><small>{isMember(g)||isOwner(g)?"Joined":"Not joined"}</small>
          <div className="row"><button className="btn s" onClick={()=>open(g)}>Open community</button>{!isMember(g)&&!isOwner(g)&&!isAdmin(user)&&<button className="btn s g" onClick={()=>join(g)}>Join community</button>}</div>
        </div>)}
        {!groups.filter(g=>g.year===activeYear).length&&<p className="mut">No communities for this year yet.</p>}
        </div>
      </>}
      {isTeacher(user)&&<form className="card" style={{marginTop:20}} onSubmit={create}><h3>Create a new community</h3>
        <label>Community name</label><input required value={name} onChange={e=>setName(e.target.value)}/>
        <label>Year</label><select value={communityMeta.year} onChange={e=>setCommunityMeta({...communityMeta,year:Number(e.target.value)})}>{[1,2,3,4].map(y=><option key={y} value={y}>Year {y}</option>)}</select>
        <label>Course</label><input required value={communityMeta.course} onChange={e=>setCommunityMeta({...communityMeta,course:e.target.value})}/>
        <label>Section</label><input required value={communityMeta.section} onChange={e=>setCommunityMeta({...communityMeta,section:e.target.value})}/>
        <p><button className="btn">Create community</button></p>
      </form>}
    </>}
  </Page>
}

/* ─── Examinations ───────────────────────────── */


function ExamChart({ examId }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    async function loadChart() {
      try {
        setSrc("");

        const response = await fetch(
          `${API_URL}/api/exams/${examId}/seating-chart`,
          { headers: getCampusImageHeaders() }
        );

        if (!response.ok) {
          throw new Error(`Exam chart failed: ${response.status}`);
        }

        const blob = await response.blob();

        if (!blob.type.startsWith("image/")) {
          throw new Error("Server did not return an image");
        }

        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch (error) {
        console.error("Exam chart loading error:", error);
      }
    }

    if (examId) loadChart();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [examId]);

  return src ? (
    <div className="exam-chart">
      <ZoomableImage
        src={src}
        alt="Exam seating chart"
        className="exam-chart-image"
      />
    </div>
  ) : null;
}

function Examinations(){
  const {user}=useAuth();
  const [data,setData]=useState({exams:[],seats:[],duties:[],requests:[],teachers:[]});
  const [err,setErr]=useState("");const [tab,setTab]=useState(isAdmin(user)?"Create":isTeacher(user)?"Teachers":"Students");
  const [search,setSearch]=useState("");
  const [exam,setExam]=useState({year:1,subject:"",date:"",time:""});
  const [examTeacher,setExamTeacher]=useState({teacherEmail:"",hall:""});
  const [seat,setSeat]=useState({examId:"",studentEmail:"",hall:"",seat:""});
  const [duty,setDuty]=useState({examId:"",teacherEmail:"",hall:"",date:"",time:""});
  const [req,setReq]=useState({examId:"",message:""});
  const [chart,setChart]=useState({new:null});
  const [activeYear,setActiveYear]=useState(null);
  const [editExam,setEditExam]=useState(null);

  async function load(){try{const d=await api("/api/exams");setData(d)}catch(e){setErr(e.message)}}
  useEffect(()=>{load()},[]);

  async function saveExam(e){e.preventDefault();try{
    const d=await api("/api/exams",{method:"POST",body:json({...exam,teacherEmail:examTeacher.teacherEmail,hall:examTeacher.hall})});
    if(chart.new){const fd=new FormData();fd.append("chart",chart.new);await api(`/api/exams/${d.exam._id}/seating-chart`,{method:"POST",body:fd})}
    setExam({year:1,subject:"",date:"",time:""});setExamTeacher({teacherEmail:"",hall:""});setChart({new:null});
    await load();setErr("Examination created successfully.");
  }catch(e){setErr(e.message)}}

  async function saveEditExam(e){e.preventDefault();try{
    await api(`/api/exams/${editExam._id}`,{method:"PATCH",body:json({year:editExam.year,subject:editExam.subject,date:editExam.date,time:editExam.time})});
    setEditExam(null);await load();setErr("Exam updated.");
  }catch(e){setErr(e.message)}}

  async function deleteExam(id){if(!confirm("Delete this exam and all its seats and duties?"))return;try{await api(`/api/exams/${id}`,{method:"DELETE"});await load();setErr("Exam deleted.")}catch(e){setErr(e.message)}}
  async function saveSeat(e){e.preventDefault();try{await api("/api/exams/seating",{method:"POST",body:json(seat)});setSeat({examId:"",studentEmail:"",hall:"",seat:""});load()}catch(e){setErr(e.message)}}
  async function saveDuty(e){e.preventDefault();try{await api("/api/exams/duties",{method:"POST",body:json(duty)});setDuty({examId:"",teacherEmail:"",hall:"",date:"",time:""});load()}catch(e){setErr(e.message)}}
  async function changeDuty(id,body){try{await api(`/api/exams/duties/${id}`,{method:"PATCH",body:json(body)});load()}catch(e){setErr(e.message)}}
  async function requestHelp(e){e.preventDefault();try{await api("/api/exams/requests",{method:"POST",body:json(req)});setReq({examId:"",message:""});load()}catch(e){setErr(e.message)}}
  async function uploadChart(id,file){if(!file)return;try{const fd=new FormData();fd.append("chart",file);await api(`/api/exams/${id}/seating-chart`,{method:"POST",body:fd});setErr("Seating chart uploaded.")}catch(e){setErr(e.message)}}

  const exams=data.exams.filter(x=>(x.subject+" "+x.year+" "+x.time+" "+new Date(x.date).toLocaleDateString()).toLowerCase().includes(search.toLowerCase()));
  const yearSeats=year=>data.seats.filter(s=>Number(s.exam?.year)===year);

  return <Page title="Examinations" subtitle="Schedules, seating plans and examination duties."><Notice text={err}/>
    {!isAdmin(user) && <section className="card" style={{marginBottom:18}}>
      <h3>Exam Schedule & Seating Charts</h3>
      {exams.map(x=><div className="it" key={`public-${x._id}`}>
        <b>{x.subject}</b>
        <p className="mut">Year {x.year} · {new Date(x.date).toLocaleDateString()} · {x.time}</p>
        {x.hasSeatingChart ? <ExamChart examId={x._id}/> : <p className="mut">Seating chart has not been uploaded yet.</p>}
      </div>)}
      {!exams.length && <p className="mut">No examinations available yet.</p>}
    </section>}
    <div className="tabs exam-tabs">{(isAdmin(user)?["Create","Students","Teachers"]:isTeacher(user)?["Teachers"]:["Students"]).map(x=><button key={x} className={tab===x?"on":""} onClick={()=>{setTab(x);setSearch("")}}>{x}</button>)}</div>
    <SearchBox value={search} onChange={setSearch} placeholder="Search exam name, year, hall, student or teacher"/>

    {tab==="Create"&&isAdmin(user)&&<div className="two exam-layout">
      <form className="card" onSubmit={editExam?saveEditExam:saveExam}>
        <h3>{editExam?"Edit examination":"Create examination"}</h3>
        {editExam?<>
          <label>Exam name</label><input required value={editExam.subject} onChange={e=>setEditExam({...editExam,subject:e.target.value})}/>
          <label>Year</label><select value={editExam.year} onChange={e=>setEditExam({...editExam,year:Number(e.target.value)})}>{[1,2,3,4].map(x=><option key={x} value={x}>{x}</option>)}</select>
          <label>Date</label><input required type="date" value={editExam.date?.slice(0,10)} onChange={e=>setEditExam({...editExam,date:e.target.value})}/>
          <label>Time</label><input required type="time" value={editExam.time} onChange={e=>setEditExam({...editExam,time:e.target.value})}/>
          <div className="row"><button className="btn">Save changes</button><button type="button" className="btn g s" onClick={()=>setEditExam(null)}>Cancel</button></div>
        </>:<>
          <label>Year</label><select value={exam.year} onChange={e=>setExam({...exam,year:Number(e.target.value)})}>{[1,2,3,4].map(x=><option key={x} value={x}>{x}</option>)}</select>
          <label>Exam / Subject name</label><input required value={exam.subject} onChange={e=>setExam({...exam,subject:e.target.value})}/>
          <label>Date</label><input required type="date" value={exam.date} onChange={e=>setExam({...exam,date:e.target.value})}/>
          <label>Time</label><input required type="time" value={exam.time} onChange={e=>setExam({...exam,time:e.target.value})}/>
          <div className="subtle-divider"/><h3>Assign teacher duty (optional)</h3>
          <label>Teacher</label><select value={examTeacher.teacherEmail} onChange={e=>setExamTeacher({...examTeacher,teacherEmail:e.target.value})}><option value="">Select teacher (optional)</option>{(data.teachers||[]).map(t=><option key={t._id} value={t.email}>{t.name} · {t.email}</option>)}</select>
          <label>Hall number</label><input value={examTeacher.hall} onChange={e=>setExamTeacher({...examTeacher,hall:e.target.value})} placeholder="Hall 101"/>
          <label>Seating chart image (optional)</label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setChart({...chart,new:e.target.files?.[0]})}/>
          <p><button className="btn">Create exam</button></p>
        </>}
      </form>
      <div className="card"><h3>Existing examinations</h3>
        {exams.map(x=><div className="it" key={x._id}>
          <div className="row" style={{justifyContent:"space-between"}}><b>{x.subject}</b><div className="row" style={{gap:6}}><button className="btn s" onClick={()=>setEditExam({...x,date:x.date})}>Edit</button><button className="btn s g" onClick={()=>deleteExam(x._id)}>Delete</button></div></div>
          <p className="mut">Year {x.year} · {new Date(x.date).toLocaleDateString()} · {x.time}</p>
          {x.hasSeatingChart&&<ExamChart examId={x._id}/>}
          <form onSubmit={e=>{e.preventDefault();uploadChart(x._id,chart[x._id])}}><label>Upload / replace seating chart</label><input type="file" accept="image/*" onChange={e=>setChart({...chart,[x._id]:e.target.files?.[0]})}/><button className="btn s">Save chart</button></form>
        </div>)}
        {!exams.length&&<p className="mut">No exams found.</p>}
      </div>
    </div>}

    {tab==="Students"&&<><div className="year-grid">{[1,2,3,4].map(y=><button className="year-card" key={y} onClick={()=>setActiveYear(activeYear===y?null:y)}>Year {y}<small>{yearSeats(y).length} assigned seats</small></button>)}</div>
      {[1,2,3,4].filter(y=>activeYear===y).map(y=><section className="card exam-year" key={y}><h3>Year {y} students</h3>
        {data.exams.filter(x=>Number(x.year)===y).map(x=><div className="it" key={x._id}><b>{x.subject}</b><p className="mut">{new Date(x.date).toLocaleDateString()} · {x.time}</p>{x.hasSeatingChart&&<ExamChart examId={x._id}/>}</div>)}
        {data.seats.filter(s=>Number(s.exam?.year)===y&&(identityOf(s.student)+" "+s.student?.email+" "+s.hall+" "+s.seat+" "+s.exam?.subject).toLowerCase().includes(search.toLowerCase())).map(s=><div className="it" key={s._id}><b>{identityOf(s.student)}</b>
<p>{s.student?.email} · {s.exam?.subject} · {s.hall} · Seat {s.seat}</p></div>)}
        {!yearSeats(y).length&&<p className="mut">No students assigned for this year yet.</p>}
      </section>)}
      {isAdmin(user)&&<form className="card" onSubmit={saveSeat}><h3>Assign / update student seating</h3>
        <label>Exam</label><select required value={seat.examId} onChange={e=>setSeat({...seat,examId:e.target.value})}><option value="">Select exam</option>{data.exams.map(x=><option key={x._id} value={x._id}>{x.subject} · Year {x.year}</option>)}</select>
        <label>Student email</label><input required type="email" value={seat.studentEmail} onChange={e=>setSeat({...seat,studentEmail:e.target.value})}/>
        <label>Hall number</label><input required value={seat.hall} onChange={e=>setSeat({...seat,hall:e.target.value})}/>
        <label>Seat number</label><input required value={seat.seat} onChange={e=>setSeat({...seat,seat:e.target.value})}/>
        <button className="btn">Save seating</button>
      </form>}
    </>}

    {tab==="Teachers"&&<><div className="card"><h3>Teacher directory & duty assignments</h3>
      {data.duties.filter(d=>(d.teacher?.name+" "+d.teacher?.email+" "+d.hall+" "+d.exam?.subject+" "+d.date).toLowerCase().includes(search.toLowerCase())).map(d=><div className="it" key={d._id}>
        <b>{d.teacher?.name} · {d.teacher?.email}</b>
        <p>{d.exam?.subject||"Exam duty"} · Year {d.year} · {d.hall} · {new Date(d.date).toLocaleDateString()} · {d.time}</p>
        {d.exam?.hasSeatingChart&&<ExamChart examId={d.exam._id}/>}
        {isAdmin(user)&&<select defaultValue={d.teacher?.email||""} onChange={e=>changeDuty(d._id,{teacherEmail:e.target.value})}><option value="">Change assigned teacher</option>{(data.teachers||[]).map(t=><option key={t._id} value={t.email}>{t.name} · {t.email}</option>)}</select>}
      </div>)}
      {!data.duties.length&&<p className="mut">No teacher duties assigned yet.</p>}
    </div>
    {isAdmin(user)&&<form className="card" onSubmit={saveDuty}><h3>Assign / change teacher duty</h3>
      <label>Exam name</label><select required value={duty.examId} onChange={e=>{const x=data.exams.find(a=>a._id===e.target.value);setDuty({...duty,examId:e.target.value,date:x?.date?.slice(0,10)||"",time:x?.time||""})}}><option value="">Select exam</option>{data.exams.map(x=><option key={x._id} value={x._id}>{x.subject} · Year {x.year}</option>)}</select>
      <label>Teacher</label><select required value={duty.teacherEmail} onChange={e=>setDuty({...duty,teacherEmail:e.target.value})}><option value="">Select teacher</option>{(data.teachers||[]).map(t=><option key={t._id} value={t.email}>{t.name} · {t.email}</option>)}</select>
      <label>Hall number</label><input required value={duty.hall} onChange={e=>setDuty({...duty,hall:e.target.value})}/>
      <label>Date</label><input required type="date" value={duty.date} onChange={e=>setDuty({...duty,date:e.target.value})}/>
      <label>Time</label><input required type="time" value={duty.time} onChange={e=>setDuty({...duty,time:e.target.value})}/>
      <button className="btn">Assign duty</button>
    </form>}
    </>}

    {roleOf(user).startsWith("Student")&&<form className="card" onSubmit={requestHelp}><h3>Exam mistake / correction request</h3>
      <label>Examination</label><select required value={req.examId} onChange={e=>setReq({...req,examId:e.target.value})}><option value="">Select exam</option>{data.exams.map(x=><option key={x._id} value={x._id}>{x.subject}</option>)}</select>
      <label>Describe the mistake</label><textarea required value={req.message} onChange={e=>setReq({...req,message:e.target.value})}/>
      <button className="btn">Submit request</button>
    </form>}
    {isAdmin(user)&&<section className="card"><h3>Exam help requests</h3>{data.requests.filter(r=>(identityOf(r.student)+" "+r.exam?.subject+" "+r.message).toLowerCase().includes(search.toLowerCase())).map(r=><div className="it" key={r._id}><b>{identityOf(r.student)} · {r.exam?.subject}</b><p>{r.message}</p><Badge text={r.status}/></div>)}</section>}
  </Page>
}

/* ─── Users ──────────────────────────────────── */
function Users(){
  const [users,setUsers]=useState([]);const [err,setErr]=useState("");const [search,setSearch]=useState("");
  const [form,setForm]=useState({name:"",email:"",password:"",role:"Student",year:1,className:"",section:"",rollNumber:""});
  const [reset,setReset]=useState({id:"",password:""});
  const [editUser,setEditUser]=useState(null);const [roleFilter,setRoleFilter]=useState("");
  const [page,setPage]=useState(1);const [totalPages,setTotalPages]=useState(1);
  const [bulkCsv,setBulkCsv]=useState("");const [bulkResult,setBulkResult]=useState(null);

  async function load(p=page){try{
    const d=await api(`/api/users?limit=20&page=${p}&search=${encodeURIComponent(search)}${roleFilter?`&role=${roleFilter}`:""}`);
    setUsers(d.users||[]);setTotalPages(d.pages||1);
  }catch(e){setErr(e.message)}}
  useEffect(()=>{load()},[]);

  async function create(e){e.preventDefault();try{
    await api("/api/users",{method:"POST",body:json(form)});
    setForm({name:"",email:"",password:"",role:"Student",year:1,className:"",section:"",rollNumber:""});
    setErr("User created successfully.");load();
  }catch(e){setErr(e.message)}}

  async function saveEdit(e){e.preventDefault();try{
    await api(`/api/users/${editUser._id}`,{method:"PATCH",body:json({name:editUser.name,year:editUser.year,className:editUser.className,section:editUser.section,rollNumber:editUser.rollNumber})});
    setEditUser(null);setErr("User updated.");load();
  }catch(e){setErr(e.message)}}

  async function patch(id,route,body){try{await api(`/api/users/${id}/${route}`,{method:"PATCH",body:json(body)});setErr("Changes saved.");load()}catch(e){setErr(e.message)}}
  async function saveReset(e){e.preventDefault();try{await api(`/api/users/${reset.id}/reset-password`,{method:"PATCH",body:json({newPassword:reset.password})});setReset({id:"",password:""});setErr("Password reset successfully.")}catch(e){setErr(e.message)}}

  async function bulkImport(){setBulkResult(null);try{
    const rows=bulkCsv.trim().split("\n").slice(1).map(line=>{const [name,email,password,role,year,className,section,rollNumber]=line.split(",").map(s=>s?.trim());return{name,email,password,role,year:Number(year)||1,className:className||"",section:section||"",rollNumber:rollNumber||""};});
    const d=await api("/api/users/bulk-import",{method:"POST",body:json({users:rows})});
    setBulkResult(d.message);setErr("");load();
  }catch(e){setErr(e.message)}}

  return <Page title="Users & Roles"><Notice text={err} type={err.includes("success")?"success":"error"}/>
    <div className="two">
      {editUser?<form className="card" onSubmit={saveEdit}><h3>Edit user: {editUser.email}</h3>
        <label>Full name</label><input required value={editUser.name} onChange={e=>setEditUser({...editUser,name:e.target.value})}/>
        <label>Year</label><select value={editUser.year||1} onChange={e=>setEditUser({...editUser,year:Number(e.target.value)})}>{[1,2,3,4].map(y=><option key={y} value={y}>Year {y}</option>)}</select>
        <label>Class / Course</label><input value={editUser.className||""} onChange={e=>setEditUser({...editUser,className:e.target.value})}/>
        <label>Section</label><input value={editUser.section||""} onChange={e=>setEditUser({...editUser,section:e.target.value})}/>
        <label>Roll number</label><input value={editUser.rollNumber||""} onChange={e=>setEditUser({...editUser,rollNumber:e.target.value})}/>
        <div className="row"><button className="btn">Save changes</button><button type="button" className="btn g s" onClick={()=>setEditUser(null)}>Cancel</button></div>
      </form>:<form className="card" onSubmit={create}><h3>Create new account</h3>
        <label>Full name</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <label>Campus email</label><input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
        <label>Temporary password (minimum 8 characters)</label><input required minLength={8} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
<label>Register Account Type</label>
<select
  value={form.role}
  onChange={e => setForm({
    ...form,
    role: e.target.value,
    year: 1,
    className: "",
    section: "",
    rollNumber: ""
  })}
>
  {["Student", "Student CR", "Teacher", "Admin"].map(r => (
    <option key={r} value={r}>{r}</option>
  ))}
</select>
        {["Student", "Student CR"].includes(form.role) && <>
          <label>Academic Year</label>
          <select required value={form.year} onChange={e=>setForm({...form,year:Number(e.target.value)})}>
            {[1,2,3,4].map(y=><option key={y} value={y}>Year {y}</option>)}
          </select>
          <label>Class / Course</label>
          <input required value={form.className} onChange={e=>setForm({...form,className:e.target.value})} placeholder="e.g. BTech CSE"/>
          <label>Section</label>
          <input required value={form.section} onChange={e=>setForm({...form,section:e.target.value})} placeholder="e.g. A"/>
          <label>Roll number</label>
          <input required value={form.rollNumber} onChange={e=>setForm({...form,rollNumber:e.target.value})}/>
        </>}
        {form.role === "Teacher" && <p className="mut">Teacher account: name, official email and temporary password only. Academic details are not required.</p>}
        {form.role === "Admin" && <p className="mut">Campus administrator account: name, official email and temporary password only.</p>}
        <button className="btn">Create account</button>
      </form>}
      <div>
        <div className="card"><h3>Reset user password</h3><form onSubmit={saveReset}>
          <label>Select user</label><select required value={reset.id} onChange={e=>setReset({...reset,id:e.target.value})}><option value="">Choose account</option>{users.filter(u=>u.role!=="Admin").map(u=><option key={u._id} value={u._id}>{identityOf(u)} · {u.email}</option>)}</select>
          <label>New password</label><input required minLength={8} type="password" value={reset.password} onChange={e=>setReset({...reset,password:e.target.value})}/>
          <button className="btn">Reset password</button>
        </form></div>
        <div className="card" style={{marginTop:16}}><h3>Bulk import (CSV)</h3>
          <p className="mut">CSV format: name,email,password,role,year,className,section,rollNumber<br/>First row is header (skipped). Role: Student / Student CR / Teacher / Admin</p>
          <textarea rows={5} placeholder="name,email,password,role,year,className,section,rollNumber&#10;John Doe,john@uni.edu,Pass1234!,Student,1,BTech CSE,A,CS001" value={bulkCsv} onChange={e=>setBulkCsv(e.target.value)}/>
          <p><button className="btn" onClick={bulkImport}>Import users</button></p>
          {bulkResult&&<p className="mut">{bulkResult}</p>}
        </div>
      </div>
    </div>
    <div className="card" style={{marginTop:20}}><h3>Manage accounts</h3>
      <div className="filter-row">
        <SearchBox value={search} onChange={setSearch} placeholder="Search name, email or role"/>
        <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}><option value="">All roles</option>{["Student","Student CR","Teacher","Admin"].map(r=><option key={r}>{r}</option>)}</select>
        <button className="btn s" onClick={()=>{setPage(1);load(1)}}>Search</button>
      </div>
      <div className="ov"><table><thead><tr><th>Identity</th><th>Email</th><th>Role</th><th>Year</th><th>Class</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {users.map(u=><tr key={u._id}>
          <td>{identityOf(u)}</td><td>{u.email}</td>
          <td><select disabled={u.role==="Admin"} value={u.role} onChange={e=>patch(u._id,"role",{role:e.target.value})}>{["Student","Student CR","Teacher","Admin"].map(r=><option key={r}>{r}</option>)}</select></td>
          <td>{u.year||"—"}</td><td>{u.className||"—"}{u.section?` / ${u.section}`:""}</td>
          <td>{u.isActive?"Active":"Disabled"}</td>
          <td><div className="row" style={{gap:4}}>
            <button className="btn s" disabled={u.role==="Admin"} onClick={()=>setEditUser({...u})}>Edit</button>
            <button className="btn s" disabled={u.role==="Admin"} onClick={()=>patch(u._id,"status",{isActive:!u.isActive})}>{u.isActive?"Disable":"Enable"}</button>
          </div></td>
        </tr>)}
      </tbody></table></div>
      <div className="filter-row" style={{marginTop:12}}>
        <button className="btn s" disabled={page<=1} onClick={()=>{setPage(p=>{const n=p-1;load(n);return n})}}>← Prev</button>
        <span>Page {page} of {totalPages}</span>
        <button className="btn s" disabled={page>=totalPages} onClick={()=>{setPage(p=>{const n=p+1;load(n);return n})}}>Next →</button>
      </div>
    </div>
  </Page>
}

/* ─── Admin-only pages ───────────────────────── */
function Security(){return <Page title="Security"><div className="card"><h3>Account security</h3><p>CampusCare uses JWT authentication, hashed passwords (bcrypt, 12 rounds), role-based API authorization, Helmet security headers, rate-limited login endpoints and tokenVersion-based session revocation.</p><p className="mut">Administrative changes to user roles and account status automatically invalidate existing sessions.</p><h3>Tenant isolation</h3><p>Every campus-owned database query is scoped to the authenticated campus tenant using AsyncLocalStorage context and Mongoose pre-query hooks. Cross-campus read or write attempts fail closed.</p></div></Page>}
function DataBackup(){const {user}=useAuth();const [msg,setMsg]=useState("");async function download(){try{const [u,r,l,c,e]=await Promise.all([api("/api/users?limit=200"),api("/api/reports?limit=200"),api("/api/lost-found?limit=200"),api("/api/communities"),api("/api/exams")]);const blob=new Blob([JSON.stringify({exported:new Date().toISOString(),users:u.users,reports:r.reports,lostFound:l.items,communities:c.groups,examinations:e},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`campuscare-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);setMsg("Backup downloaded.")}catch(e){setMsg(e.message)}}return <Page title="Data & Backup"><div className="card"><p>Export CampusCare records to a JSON backup file. This backup covers your campus data only.</p><button className="btn" onClick={download}>Download campus backup</button><Notice text={msg} type={msg.includes("downloaded")?"success":"error"}/></div></Page>}

/* ─── Platform Console ───────────────────────── */
function PlatformConsole(){
  const [token,setToken]=useState(sessionStorage.getItem("campuscare_platform_token")||"");
  const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [campuses,setCampuses]=useState([]);
  const [form,setForm]=useState({name:"",institutionName:"",slug:"",adminName:"",adminEmail:"",adminPassword:"",primaryDomain:""});
  const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);const [tab,setTab]=useState("campuses");

  async function platformApi(path,options={}){const headers=new Headers(options.headers||{});if(token)headers.set("Authorization",`Bearer ${token}`);if(options.body&&!(options.body instanceof FormData))headers.set("Content-Type","application/json");const r=await fetch(`${API_URL}${path}`,{...options,headers});const d=await r.json();if(!r.ok)throw new Error(d.message||"Request failed");return d;}
  async function loginPlatform(e){e.preventDefault();setBusy(true);setMessage("");try{const d=await platformApi("/api/platform/auth/login",{method:"POST",body:JSON.stringify({email,password})});sessionStorage.setItem("campuscare_platform_token",d.token);setToken(d.token);setMessage("Platform owner signed in.");}catch(e){setMessage(e.message)}finally{setBusy(false)}}
  async function load(){try{const d=await platformApi("/api/platform/campuses");setCampuses(d.campuses||[])}catch(e){setMessage(e.message)}}
  useEffect(()=>{if(token)load()},[token]);
  async function create(e){e.preventDefault();setBusy(true);setMessage("");try{await platformApi("/api/platform/campuses",{method:"POST",body:JSON.stringify(form)});setForm({name:"",institutionName:"",slug:"",adminName:"",adminEmail:"",adminPassword:"",primaryDomain:""});setMessage("Campus and initial campus administrator created.");await load()}catch(e){setMessage(e.message)}finally{setBusy(false)}}
  async function toggleStatus(c){try{await platformApi(`/api/platform/campuses/${c._id}/status`,{method:"PATCH",body:JSON.stringify({status:c.status==="active"?"suspended":"active"})});load()}catch(e){setMessage(e.message)}}

  if(!token)return <div className="wrap page-content"><h2>CampusCare Platform Console</h2><form className="card" style={{maxWidth:460}} onSubmit={loginPlatform}><label>Platform owner email</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/><label>Platform owner password</label><input type="password" required value={password} onChange={e=>setPassword(e.target.value)}/><button className="btn" disabled={busy}>Sign in</button>{message&&<p className="auth-message">{message}</p>}</form></div>;

  const field=(key,label,type="text")=><label key={key}>{label}<input required type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>;
  const stats={total:campuses.length,active:campuses.filter(c=>c.status==="active").length,suspended:campuses.filter(c=>c.status==="suspended").length};

  return <div className="wrap page-content">
    <div className="row" style={{justifyContent:"space-between"}}><h2>Platform Console</h2><button className="btn wg" onClick={()=>{sessionStorage.removeItem("campuscare_platform_token");setToken("")}}>Log out</button></div>
    <div className="grid" style={{gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:14,margin:"18px 0"}}>
      <StatCard label="Total Campuses" value={stats.total}/><StatCard label="Active" value={stats.active}/><StatCard label="Suspended" value={stats.suspended}/>
    </div>
    <div className="tabs"><button className={tab==="campuses"?"on":""} onClick={()=>setTab("campuses")}>Campuses</button><button className={tab==="create"?"on":""} onClick={()=>setTab("create")}>Create campus</button></div>
    {message&&<p className="auth-message" style={{marginTop:12}}>{message}</p>}
    {tab==="create"&&<form className="card" onSubmit={create}><h3>Create campus</h3>
      <div className="two">{field("name","Campus name")}{field("institutionName","University / institution")}{field("slug","Campus code (e.g. skit)")}{field("primaryDomain","Custom domain (optional)")}{field("adminName","First campus admin name")}{field("adminEmail","First campus admin email","email")}{field("adminPassword","Initial admin password (12+ characters)","password")}</div>
      <button className="btn" disabled={busy}>Create campus</button>
    </form>}
    {tab==="campuses"&&<div className="card">{campuses.map(c=><div key={c._id} style={{padding:"12px 0",borderBottom:"1px solid var(--ln)"}}>
      <div className="row" style={{justifyContent:"space-between"}}>
        <div><b>{c.institutionName} — {c.name}</b><div className="mut">{c.slug}.campuscare.in · Plan: {c.plan}<span style={{marginLeft:8}}><Badge text={c.status}/></span></div></div>
        <button className="btn wg" onClick={()=>toggleStatus(c)}>{c.status==="active"?"Suspend":"Activate"}</button>
      </div>
    </div>)}{!campuses.length&&<p className="mut">No campuses created yet.</p>}</div>}
  </div>;
}

/* ─── App Routes ─────────────────────────────── */
function AppRoutes(){return <Shell><Routes>
  <Route path="/" element={<Home/>}/>
  <Route path="/about" element={<About/>}/>
  <Route path="/contact" element={<Contact/>}/>
  <Route path="/help" element={<Help/>}/>
  <Route path="/login" element={<Login defaultTab="login"/>}/>
  <Route path="/register" element={<Navigate to="/login" replace/>}/>
  <Route path="/register-campus" element={<Login defaultTab="campus"/>}/>
  <Route path="/platform" element={<PlatformConsole/>}/>
  <Route path="/dashboard" element={<Protected><Dashboard/></Protected>}/>
  <Route path="/lost-found" element={<Protected><LostFound/></Protected>}/>
  <Route path="/reports" element={<Protected><Reports/></Protected>}/>
  <Route path="/community" element={<Protected><Community/></Protected>}/>
  <Route path="/examinations" element={<Protected><Examinations/></Protected>}/>
  <Route path="/users" element={<Protected roles={["Admin"]}><Users/></Protected>}/>
  <Route path="/security" element={<Protected roles={["Admin"]}><Security/></Protected>}/>
  <Route path="/data" element={<Protected roles={["Admin"]}><DataBackup/></Protected>}/>
  <Route path="/profile" element={<Protected><Profile/></Protected>}/>
  <Route path="*" element={<Page title="Page not found"><Link to="/">Return home</Link></Page>}/>
</Routes></Shell>}

export default function App(){return <BrowserRouter><AuthProvider><AppRoutes/></AuthProvider></BrowserRouter>}
