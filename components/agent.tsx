
import { useState, useRef, useEffect, FormEvent, KeyboardEvent} from "react";
import styles from "../styles/Home.module.css";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "next/link";
import axios from "axios";
import { Box, Divider, Drawer, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from "@mui/material";
import SettingsIcon from '@mui/icons-material/Settings';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import { clear, del, get, set } from "@/utils/db";
import truncate from "truncate";
import { Thread } from "@/utils/types";

export default function Agent({user} : {user: {sub: string, email: string}}) {
  const [userInput, setUserInput] = useState("");
  const [currentThread, setCurrentThread] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [threadList, setThreadList] = useState([] as Thread[]);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi there! I'm Nemos, your friendly neighborhood Architect. How can I help?" },
  ]);
  const messageListRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    //console.log(user);
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

    retrieveThreads();
  }, []);

  // Handle errors
  const handleError = () => {
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        role: "assistant",
        content: "Oops! There seems to be an error. Please try again later.",
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

  const retrieveThreads = async () => {
    const threads = await get('threads');
    if (threads) {
      setThreadList(threads);
    }
  }

  const updateThreads = async (_threadId: string, _name: string) => {
    const currentThreads = await get('threads');
    if (!currentThreads) {
      await set('threads', [{threadId: _threadId, name: _name}]);
      return;
    } 
    if (currentThreads.find((element: Thread) => element.threadId === _threadId)) {
      return;
    }
    await set('threads', [...currentThreads, {threadId: _threadId, name: _name}]);
    return;
  }

  const switchThread = async (threadId: string) => {
    setCurrentThread(threadId);
    const threadDetails = await axios({
      url: `/api/chat?threadId=${threadId}`,
      method: "PATCH",
      timeout: 60000      
    });
    const _messages = threadDetails.data.messages.body.data;
    const result = _messages.reverse().map((value: { role: any; content: { text: { value: any; }; }[]; }) => {
      return {role: value.role, content: value.content[0].text.value};
    })
    setMessages([{ role: "assistant", content: "Hi there! I'm Nemos, your friendly neighborhood Architect. How can I help?" }, ...result]);
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
      url: `/api/chat?sub=${user.sub}`,
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
    const firstMessage = context.find((value: {role: string}) => value.role as string === 'user');
    await updateThreads(threadId, firstMessage?.content as string);
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

  const toggleDrawer =
    (open: boolean) =>
    (event: React.KeyboardEvent | React.MouseEvent) => {
      if (
        event.type === 'keydown' &&
        ((event as React.KeyboardEvent).key === 'Tab' ||
          (event as React.KeyboardEvent).key === 'Shift')
      ) {
        return;
      }
      setIsSidebarOpen(open);
    };

  const list = () => (
    <Box
      sx={{ width: 250, backgroundColor: '#1d2333 !important', height: '90vh', overflowY: 'scroll'}}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      
      <List>
        <ListItem sx={{color: 'white'}}>
          <ListItemText primary={<Typography variant={'h5'} textAlign={'center'}>Conversations</Typography>} />
        </ListItem>
        <Divider sx={{color:'snow', borderColor: '#444'}}/>
        {threadList.map((thread, index) => (
          <ListItem key={thread.threadId} disablePadding sx={{color: 'white'}}>
            <ListItemButton onClick={() => switchThread(thread.threadId)}>
              <ListItemText primary={<Typography variant={'body2'}>{truncate(thread.name, 25)}</Typography>} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

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
            . Limited to 25 requests per hour.
          </p>
        </div>
      </div>
      <Drawer
        anchor={'left'}
        open={isSidebarOpen}
        onClose={toggleDrawer(false)}
        sx={{backgroundColor: '#1d2333 !important' }}
        PaperProps={{
          sx: {
            backgroundColor: "#1d2333",
            color: "snow",
          }
        }}
      >
        <Stack direction={'column'} spacing={0}>
          {list()}
          <Box sx={{height: '10vh', zIndex:10000}}>
            <Divider sx={{color:'snow', borderColor: '#444'}}/>
          </Box>
        </Stack>
      </Drawer>
      <IconButton color={'inherit'} sx={{position: 'absolute', bottom: 0, left: 0, padding: 2 }} onClick={toggleDrawer(true)}><ViewSidebarIcon /></IconButton>
    </main>
  );
}
