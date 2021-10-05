import Head from "next/head";
import Image from "next/image";
import { getSession, signIn, signOut, useSession } from "next-auth/client";

import styles from "../styles/Home.module.css";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { prisma } from "../lib/db";
import { CSSProperties } from "react";

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const session = await getSession(context);
  if (session) {
    const accounts = await prisma.account.findMany({
      select: {
        id: true,
        workspaceIcon: true,
        workspaceId: true,
        workspaceName: true,
        providerAccountId: true,
        providerType: true,
        providerId: true,
      },
      where: {
        userId: session.userId,
      },
    });

    return {
      props: {
        accounts,
      },
    };
  }

  return {
    props: {
      accounts: [],
    },
  };
};

function NotionIcon(props: {
  src: string | null | undefined;
  title: string | null;
  width: string | number;
}) {
  const { src, width } = props;
  const title = props.title || "unknown icon";
  const style: CSSProperties = {
    boxShadow: "0x 2px 8px rgba(15, 15, 15, 0.1)",
    display: "inline-block",
    width: width,
    height: width,
    fontSize: width,
    lineHeight: typeof width === "number" ? `${width}px` : width,
    borderRadius: "8%",
  };
  if (src && src.match(/^https?:/)) {
    return <img title={title} src={src} style={style} />;
  }

  return (
    <span title={title} style={style}>
      {src}
    </span>
  );
}

type HomeProps = InferGetServerSidePropsType<typeof getServerSideProps>;

export default function Home(props: HomeProps) {
  const [session, loading] = useSession();

  const { accounts } = props;

  return (
    <>
      {!session && (
        <>
          Not signed in <br />
          <button onClick={() => signIn()}>Sign in</button>
        </>
      )}
      {session && (
        <>
          <div>
            Signed in as {session.user?.email}
            <NotionIcon
              src={session.user?.image}
              title="user profile icon"
              width={40}
            />
            <div>
              <button onClick={() => signOut()}>Sign out</button>
            </div>
          </div>
          <hr />
          <div>
            <h3>Workspaces</h3>
            {accounts.map((account) => {
              return (
                <div key={account.id}>
                  <h4>{account.workspaceName}</h4>
                  <NotionIcon
                    src={account.workspaceIcon}
                    title={account.workspaceName}
                    width={80}
                  />
                </div>
              );
            })}
          </div>
          <div>
            <button onClick={() => signIn()}>Add or update workspace</button>
          </div>
        </>
      )}
    </>
  );
}
