
import { useState, useRef, useEffect, FormEvent, KeyboardEvent} from "react";
import styles from "../styles/Home.module.css";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "next/link";
import axios from "axios";

export default function Agent({user} : {user: {sub: string, email: string}}) {
  const [userInput, setUserInput] = useState("");
  const [currentThread, setCurrentThread] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi there! I'm Nicholas, your friendly neighborhood Architect. How can I help?" },
  ]);
  const messageListRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    console.log(user);
  }, [user])
  
  // Auto scroll chat to bottom
  useEffect(() => {
    if (messageListRef.current) {
      const messageList = messageListRef.current;
      messageList.scrollTop = messageList.scrollHeight;
    }
  }, [messages]);

  // Focus on input field
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  }, []);

  // Handle errors
  const handleError = () => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        role: "assistant",
        content: "Oops! There seems to be an error. Please try again.",
      },
    ]);
    setLoading(false);
    setUserInput("");
  };

  const isRunComplete = async (threadId: string, runId: string) : Promise<any> => {
    const runStatus = await axios({
      url: `/api/chat?runId=${runId}&threadId=${threadId}`,
      method: "GET",
      timeout: 60000      
    });

    if (runStatus.data.status === 'in_progress') {
      return await isRunComplete(threadId, runId);
    } else if (runStatus.data.status === 'failed') {
      return null;
    } else if (runStatus.data.status === 'complete') {
      console.log(runStatus.data);
      return runStatus.data.result.value;
    } else {
      return null;
    }
  }

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (userInput.trim() === "") {
      return;
    }

    setLoading(true);
    const context = [...messages, { role: "user", content: userInput }];
    setMessages(context);

    // Send chat history to API
    const sendMessage = await axios({
      url: "/api/chat",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify({ message: userInput, threadId: currentThread }),
      timeout: 60000      
    });

    if (!sendMessage.data || sendMessage.data.error) {
      handleError();
      return;
    }
    console.log(sendMessage.data);
    const threadId = sendMessage.data.threadId;
    setCurrentThread(threadId);
    const runId = sendMessage.data.runId;

    const responseMessage = await isRunComplete(threadId, runId);
    if (!responseMessage) {
      handleError();
      return;
    }

    // Reset user input
    setUserInput("");

    //const data = await response.json();

    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "assistant", content: responseMessage },
    ]);
    setLoading(false);
  };

  // Prevent blank submissions and allow for multiline input
  const handleEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && userInput) {
      if (!e.shiftKey && userInput) {
        handleSubmit(e);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.cloud}>
        <div ref={messageListRef} className={styles.messagelist}>
          {messages.map((message, index) => {
            return (
              // The latest message sent by the user will be animated while waiting for a response
              <div
                key={index}
                className={
                  message.role === "user" &&
                  loading &&
                  index === messages.length - 1
                    ? styles.usermessagewaiting
                    : message.role === "assistant"
                    ? styles.apimessage
                    : styles.usermessage
                }
              >
                {/* Display the correct icon depending on the message type */}
                {message.role === "assistant" ? (
                  <Image
                    src="/Fox_Logo.png"
                    alt="AI"
                    width="30"
                    height="30"
                    className={styles.boticon}
                    priority={true}
                  />
                ) : (
                  <Image
                    src="/usericon.png"
                    alt="Me"
                    width="30"
                    height="30"
                    className={styles.usericon}
                    priority={true}
                  />
                )}
                <div className={styles.markdownanswer}>
                  {/* Messages are being rendered in Markdown format */}
                  <ReactMarkdown linkTarget={"_blank"}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className={styles.center}>
        <div className={styles.cloudform}>
          <form onSubmit={handleSubmit}>
            <textarea
              disabled={loading}
              onKeyDown={handleEnter}
              ref={textAreaRef}
              autoFocus={false}
              rows={1}
              maxLength={512}
              
              id="userInput"
              name="userInput"
              placeholder={
                loading ? "Waiting for response..." : "Type your question..."
              }
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className={styles.textarea}
            />
            <button
              type="submit"
              disabled={loading}
              className={styles.generatebutton}
            >
              {loading ? (
                <div className={styles.loadingwheel}>
                  <CircularProgress color="inherit" size={20} />{" "}
                </div>
              ) : (
                // Send icon SVG in input field
                <svg
                  viewBox="0 0 20 20"
                  className={styles.svgicon}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                </svg>
              )}
            </button>
          </form>
        </div>
        <div className={styles.footer}>
          <p>
            Powered by{" "}
            <a href="https://openai.com/" target="_blank">
              OpenAI
            </a>
            . 
          </p>
        </div>
      </div>
    </main>
  );
}
