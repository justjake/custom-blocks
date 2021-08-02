import Head from 'next/head'
import Image from 'next/image'
import { signIn, signOut, useSession } from 'next-auth/client'

import styles from '../styles/Home.module.css'

export default function Home() {
  const [ session, loading ] = useSession()

  return <>
    {!session && <>
      Not signed in <br/>
      <button onClick={() => signIn()}>Sign in</button>
    </>}
    {session && <>
      Signed in as {session.user?.email} <br/>
      <button onClick={() => signOut()}>Sign out</button>
    </>}
  </>

}
