
import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "next/link";
import { styled, alpha } from '@mui/material/styles';
import axios from "axios";
import { Auth0Provider, User, useAuth0 } from "@auth0/auth0-react";
import { run } from "node:test";
import { Connection } from "jsforce"
import Agent from "@/components/agent";
import { IconSalesforce } from "@/components/icons";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Box, Button, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, MenuProps, Stack, Typography } from "@mui/material";
import React from "react";
import { Metadata, UserInfo } from "@/utils/types";
import { get, set } from "@/utils/db";
import { nanoid } from "@/utils/utils";
import { uploadFile } from "@/utils/api";
//import MetadataButton from "@/components/metadataButton";


const StyledMenu = styled((props: MenuProps) => (
  <Menu
    elevation={0}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'right',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'right',
    }}
    {...props}
  />
))(({ theme }) => ({
  '& .MuiPaper-root': {
    borderRadius: 6,
    marginTop: theme.spacing(1),
    minWidth: 180,
    color: theme.palette.grey[300],
    backgroundColor: theme.palette.grey[800],
    boxShadow:
      'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
    '& .MuiMenu-list': {
      padding: '4px 0',
    },
    '& .MuiMenuItem-root': {
      '& .MuiSvgIcon-root': {
        fontSize: 18,
        color: theme.palette.text.secondary,
        marginRight: theme.spacing(1.5),
      },
      '&:active': {
        backgroundColor: alpha(
          theme.palette.primary.main,
          theme.palette.action.selectedOpacity,
        ),
      },
    },
  },
}));

export default function Home({ useHeader }: { useHeader: boolean }) {
  const { isAuthenticated, loginWithRedirect, loginWithPopup, logout, user } = useAuth0();
  const [userInfo, setUserInfo] = useState({
    id: ''
  } as UserInfo);
  const [isDeleteHover, setIsDeleteHover] = useState(false);
  const [internalMetadata, setInternalMetadata] = useState({} as Metadata);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [fileId, setFileId] = useState('');
  const [refreshId, setRefreshId] = useState('');

  async function retrieveMetadata() {
    setLoading(true);
    setStage(`Metadata`);
    const metadata = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=metadata`)).json()
    setStage(`Tooling`);
    const tooling = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=tooling`)).json()
    setStage(`Classes`);
    const apex = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=classes`)).json()
    const apexComplete = apex.reduce((finalVal: any, val: { value: any; }) => {
      return [...finalVal, val.value];
    }, [])
    const apexFiltered = apexComplete.filter((val: { Body: string; }) => {
      return val.Body !== '(hidden)'
    })
    setStage(`Triggers`);
    const triggers = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=triggers`)).json()
    const triggerComplete = triggers.reduce((finalVal: any[], val: { value: any; }) => {
      return [...finalVal, val.value];
    }, [])
    const triggerFiltered = triggerComplete.filter((val: { Body: string; }) => {
      return val.Body !== '(hidden)'
    })
    setStage(`Flows`);
    const flows = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=flows`)).json()
    const flowsComplete = flows.reduce((finalVal: any[], val: { value: any; }) => {
      return [...finalVal, ...val.value];
    }, [])
    const flowsFiltered = flowsComplete.filter((val: { fullName: string; }) => {
      return val.fullName !== null
    })

    //setStage(`approval`);
    //const approval = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=approval`)).json()
    setStage(`Objects`);
    const objects = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=objects`)).json()
    setStage('Fields');
    const fields = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=fields`)).json()
    setStage('Validation Rules');
    const validations = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=validations`)).json()
    setStage(`Assignment Rules`);
    const assignment = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=assignment`)).json()
    setStage(`Aura Components`);
    const aura = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=aura`)).json()
    setStage(`Connected Apps`);
    const connected = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=connected`)).json()
    //setStage(`duplicate`);
    //const duplicate = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=duplicate`)).json()
    setStage(`Lightning Messages`);
    const lightningMessage = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=lightningMessage`)).json()
    setStage(`Permission Sets`);
    const permissionSet = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=permissionSet`)).json()
    setStage(`Path Assistants`);
    const pathAssistant = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=pathAssistant`)).json()
    //setStage(`profile`);
    //const profile = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=profile`)).json()
    setStage(`Reports`);
    const report = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=report`)).json()
    //setStage(`territory`);
    //const territory = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=territory`)).json()
    //setStage(`queueconfig`);
    //const queueconfig = await (await fetch(`/api/adapter/salesforce/metadata?sub=${user?.sub}&type=queueconfig`)).json()
    setStage(`Compiling`);
    const fullDataset = {
      objects,
      metadata: metadata.metadataObjects,
      tooling: tooling.sobjects,
      apex: apexFiltered,
      triggers: triggerFiltered,
      flows: flowsFiltered,
      //approval,
      assignment,
      aura,
      connected,
      //duplicate,
      lightningMessage,
      permissionSet,
      pathAssistant,
      //profile,
      report,
      fields,
      validations,
      //territory,
      //queueconfig,
    }

    await set('sfdc:metadata', fullDataset);
    setInternalMetadata(fullDataset);

    setStage('Uploading to OpenAI');
    const openAIKey = await get('openAIKey');
    const uploadData = await uploadFile(fullDataset, openAIKey);
    await set('fileId', uploadData.fileId);
    setFileId(uploadData.fileId.id);
    setStage('');
    setLoading(false);
    setRefreshId(nanoid())
  }
  // user infos
  useEffect(() => {
    const runAsync = async () => {
      const result = await fetch(`/api/adapter/salesforce/user?sub=${user?.sub}`);
      const _userInfo = await result.json();
      console.log('userInfo', _userInfo);
      if (_userInfo && userInfo !== null) {
        setUserInfo(_userInfo as UserInfo);
      }
    }
    runAsync()
  }, [user])

  useEffect(() => {
    const runAsync = async () => {
      const metadata = await get('sfdc:metadata');
      if (metadata) {
        console.log(metadata);
        setInternalMetadata(metadata);
      }
      const _fileId = await get('fileId');
      if (_fileId) {
        setFileId(_fileId.id);
      }
    }
    runAsync();
  }, [])

  const authorize = async () => {
    window.location.assign(`/api/adapter/salesforce?sub=${user?.sub}`);
  }

  const deleteAuth = async () => {
    const result = await fetch(`/api/adapter/salesforce?sub=${user?.sub}`, { method: 'DELETE' });
    setUserInfo({ id: '' } as UserInfo);
  }

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  function MetadataButton() {
    return (
      <MenuItem onClick={() => retrieveMetadata()}>
        {!loading &&
          <>
            {fileId.length > 0 && <ListItemIcon><CheckCircleIcon sx={{ textAlign: 'center', mx: 'auto', color: 'green !important' }} /></ListItemIcon>}

            <Typography variant={'body1'}>{'Refresh Metadata'}</Typography>
          </>
        }
        {loading &&
          <>
            <ListItemIcon><CircularProgress size={20} sx={{ textAlign: 'center', mx: 'auto' }} /></ListItemIcon>
            <Typography variant={'body1'}>{stage}</Typography>
          </>
        }
      </MenuItem>
    );
  }

  if (!isAuthenticated) {
    return <div className={styles.loginbuttondiv}><button className={styles.loginbutton} onClick={() => loginWithPopup()}>Log in</button></div>;
  }

  return (

    <>
      {useHeader &&
        <div className={styles.topnav}>
          <div className={styles.navlogo}>
            <Image src={'/Fox_Logo.png'} alt={""} width={25} height={25} />
            <Link href="/">PixelArchitect</Link>
          </div>
          <div className={styles.navlinks}>
            {/*<a
              href="https://platform.openai.com/docs/models/gpt-4"
              target="_blank"
            >
              Docs
            </a>*/}
            {userInfo && userInfo.id.length === 0 &&
              <Button variant={'text'} onClick={() => { authorize() }} endIcon={<IconSalesforce />} sx={{ textTransform: 'none', fontWeight: 'bold' }}>Connect</Button>
            }
            {userInfo.id.length > 0 &&
              <>
                <IconButton
                  id="basic-button"
                  onClick={handleClick}
                  sx={{ paddingY: .45 }}
                >
                  <IconSalesforce />
                </IconButton>
                <StyledMenu
                  id="basic-menu"
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleClose}
                  MenuListProps={{
                    'aria-labelledby': 'basic-button',
                  }}
                  sx={{ marginY: 0, paddingY: 0 }}
                >
                  <MenuItem>{userInfo.name}</MenuItem>
                  <Divider />

                  <MetadataButton />
                  <MenuItem onClick={() => deleteAuth()} >
                    <ListItemText inset>Disconnect</ListItemText>
                  </MenuItem>
                </StyledMenu>
              </>
            }

            <button onClick={() => logout()} className={styles.loginbutton}>Logout</button>

          </div>
        </div>
      }

      <Agent user={{ sub: user?.sub as string, email: user?.email as string }} refreshId={refreshId} />
    </>
  );
}
