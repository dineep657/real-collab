import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const socket = io(SOCKET_URL);

const EditorComponent = ({ user }) => {
  const navigate = useNavigate();
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// start code here");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [outPut, setOutPut] = useState("");
  const [version, setVersion] = useState("*");
  const [userInput, setUserInput] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Check for saved room on mount
  useEffect(() => {
    if (!user) return;

    const savedRoomId = sessionStorage.getItem('roomId');
    const savedUserName = sessionStorage.getItem('userName');

    // Verify saved username matches current user
    if (savedRoomId && savedUserName === user.name) {
      setRoomId(savedRoomId);
      socket.emit("join", { roomId: savedRoomId, userName: user.name });
      setJoined(true);
    }
  }, [user]);

  useEffect(() => {
    socket.on("userJoined", (users) => {
      setUsers(users);
    });

    socket.on("codeUpdate", (newCode) => {
      setCode(newCode);
    });

    socket.on("userTyping", (userName) => {
      setTyping(`${userName.slice(0, 15)}... is Typing`);
      setTimeout(() => setTyping(""), 2000);
    });

    socket.on("languageUpdate", (newLanguage) => {
      setLanguage(newLanguage);
    });

    socket.on("codeResponse", (response) => {
      setOutPut(response.run.output);
    });

    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("codeResponse");
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const joinRoom = () => {
    if (roomId && user) {
      socket.emit("join", { roomId, userName: user.name });
      setJoined(true);
      sessionStorage.setItem('roomId', roomId);
      sessionStorage.setItem('userName', user.name);
    }
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    setJoined(false);
    sessionStorage.removeItem('roomId');
    sessionStorage.removeItem('userName');
    navigate('/');
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied!");
    setTimeout(() => setCopySuccess(""), 2000);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName: user.name });
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", { roomId, language: newLanguage });
  };

  const runCode = () => {
    socket.emit("compileCode", {
      code,
      roomId,
      language,
      version,
      input: userInput,
    });
  };

  const createRoomId = () => {
    const newRoomId = 'room-' + Math.random().toString(36).substr(2, 9);
    setRoomId(newRoomId);
  };

  // Show loading if user is not available yet
  if (!user) {
    return null;
  }

  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-form">
          <h1>Join Code Room</h1>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.9)', 
            marginBottom: '1.5rem',
            fontSize: '1.1rem',
            fontWeight: '500'
          }}>
            Welcome, {user.name}!
          </p>
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <button onClick={createRoomId}>Create New Room</button>
          <button onClick={joinRoom} disabled={!roomId}>
            Join Room
          </button>
          <button 
            onClick={() => navigate('/')}
            style={{ marginTop: '10px', backgroundColor: '#6c757d' }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="sidebar">
        <div className="room-info">
          <h2>Room: {roomId}</h2>
          <button onClick={copyRoomId} className="copy-button">
            Copy Room ID
          </button>
          {copySuccess && <span className="copy-success">{copySuccess}</span>}
        </div>
        
        <div style={{
          padding: '0.75rem',
          background: 'rgba(52, 152, 219, 0.1)',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '1px solid rgba(52, 152, 219, 0.3)'
        }}>
          <p style={{ 
            color: '#3498db', 
            fontSize: '0.9rem',
            fontWeight: '600',
            marginBottom: '0.25rem'
          }}>
            Logged in as:
          </p>
          <p style={{ 
            color: '#ecf0f1', 
            fontSize: '1rem',
            fontWeight: '500'
          }}>
            {user.name}
          </p>
        </div>

        <h3>Users in Room ({users.length}):</h3>
        <ul>
          {users.map((userName, index) => (
            <li key={index}>
              {userName}
              {userName === user.name && (
                <span style={{ 
                  marginLeft: '0.5rem', 
                  color: '#2ecc71',
                  fontSize: '0.85rem',
                  fontWeight: 'bold'
                }}>
                  (You)
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="typing-indicator">{typing}</p>
        <select
          className="language-selector"
          value={language}
          onChange={handleLanguageChange}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>
        <button className="leave-button" onClick={leaveRoom}>
          Leave Room
        </button>
      </div>

      <div className="editor-wrapper">
        <Editor
          height={"60%"}
          defaultLanguage={language}
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
          }}
        />
        <textarea
          className="input-console"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter input here..."
        />
        <button className="run-btn" onClick={runCode}>
          Execute Code
        </button>
        <textarea
          className="output-console"
          value={outPut}
          readOnly
          placeholder="Output will appear here..."
        />
      </div>
    </div>
  );
};

export default EditorComponent;