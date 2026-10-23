/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./Updater.css";

import { Card } from "@components/Card";
import { ErrorCard } from "@components/ErrorCard";
import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { relaunch } from "@utils/native";
import { changes, checkForUpdates, update, updateError } from "@utils/updater";
import { Button, ConfirmModal,Forms, openModal, React, ReactDOM, useEffect, useState } from "@webpack/common";

import { getErrorMessage, runWithDispatch } from "./runWithDispatch";

export interface CommonProps {
    repo: string;
    repoPending: boolean;
}

export function HashLink({ repo, hash, disabled = false }: { repo: string, hash: string, disabled?: boolean; }) {
    return (
        <Link href={`${repo}/commit/${hash}`} disabled={disabled}>
            {hash}
        </Link>
    );
}

export function Changes({ updates, repo, repoPending }: CommonProps & { updates: typeof changes; }) {
    return (
        <Card style={{ padding: "0 0.5em" }} defaultPadding={false}>
            {updates.map(({ hash, author, message }) => (
                <div
                    key={hash}
                    style={{
                        marginTop: "0.5em",
                        marginBottom: "0.5em"
                    }}
                >
                    <code>
                        <HashLink {...{ repo, hash }} disabled={repoPending} />
                    </code>

                    <span style={{
                        marginLeft: "0.5em",
                        color: "var(--text-default)"
                    }}>
                        {message} - {author}
                    </span>
                </div>
            ))}
        </Card>
    );
}

export function Newer(props: CommonProps) {
    return (
        <>
            <Forms.FormText className={Margins.bottom8}>
                Your local copy has more recent commits. Please stash or reset them.
            </Forms.FormText>
            <Changes {...props} updates={changes} />
        </>
    );
}

export function Updatable(props: CommonProps) {
    const [updates, setUpdates] = useState(changes);
    const [isChecking, setIsChecking] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [checkError, setCheckError] = useState(updateError);
    const [feedback, setFeedback] = useState("");

    useEffect(() => {
        if (!feedback || isChecking) return;
        const timeout = setTimeout(() => setFeedback(""), 6000);
        return () => clearTimeout(timeout);
    }, [feedback, isChecking]);

    const isOutdated = (updates?.length ?? 0) > 0;

    return (
        <>
            {(isChecking || feedback) && ReactDOM.createPortal(
                <div className="vc-updater-status" role="status" aria-live="polite" aria-atomic="true">
                    <Card variant={checkError ? "danger" : isChecking ? "info" : "success"}>
                        <Paragraph>{isChecking ? "Checking for updates…" : feedback}</Paragraph>
                    </Card>
                </div>, document.body
            )}
            {isChecking ? (
                <Forms.FormText className={Margins.bottom8} role="status">
                    Checking for updates…
                </Forms.FormText>
            ) : checkError ? (
                <>
                    <Forms.FormText>Failed to check for updates. Please try again.</Forms.FormText>
                    <ErrorCard style={{ padding: "1em" }}>
                        <p>{getErrorMessage(checkError)}</p>
                    </ErrorCard>
                </>
            ) : (
                <Forms.FormText className={Margins.bottom8}>
                    {isOutdated ? (updates.length === 1 ? "There is 1 Update" : `There are ${updates.length} Updates`) : "Up to Date!"}
                </Forms.FormText>
            )}

            {isOutdated && <Changes updates={updates} {...props} />}

            <Flex className={classes(Margins.bottom8, Margins.top8)}>
                {isOutdated && (
                    <Button
                        disabled={isUpdating || isChecking}
                        onClick={runWithDispatch(setIsUpdating, async () => {
                            if (await update()) {
                                setUpdates([]);

                                await new Promise<void>(r => {
                                    openModal(props => (
                                        <ConfirmModal
                                            {...props}
                                            title="Update Success!"
                                            subtitle="Successfully updated. Restart now to apply the changes?"
                                            confirmText="Restart"
                                            cancelText="Not now!"
                                            variant="primary"
                                            onConfirm={() => {
                                                relaunch();
                                                r();
                                            }}
                                            onCancel={r}
                                        />
                                    ));
                                });
                            }
                        })}
                    >
                        Update Now
                    </Button>
                )}
                <Button
                    disabled={isUpdating || isChecking}
                    onClick={async () => {
                        setIsChecking(true);
                        setCheckError(undefined);
                        setFeedback("");
                        try {
                            const outdated = await checkForUpdates();

                            setUpdates(outdated ? changes : []);
                            setFeedback(outdated
                                ? changes.length === 1 ? "Found 1 update!" : `Found ${changes.length} updates!`
                                : "You're up to date. No updates found!");
                        } catch (error) {
                            setUpdates([]);
                            setCheckError(error);
                            setFeedback(`Could not check for updates: ${getErrorMessage(error)}`);
                        } finally {
                            setIsChecking(false);
                        }
                    }}
                >
                    {isChecking ? "Checking…" : "Check for Updates"}
                </Button>
            </Flex>
        </>
    );
}
