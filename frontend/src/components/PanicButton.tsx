import { Button, Modal } from "antd";
import { useState } from "react";
import { getRandomExcuse } from "../shared/excuses";


export const PanicButton = () => {
    const [isPanicModalVisible, setIsPanicModalVisible] = useState(false);
    const [excuse, setExcuse] = useState("");
    const [showFlash, setShowFlash] = useState(false);

    const handlePanicClick = () => {
        setExcuse(getRandomExcuse());
        // Trigger red flash
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 500);
        setIsPanicModalVisible(true);
    };

    const handleOk = () => {
        setIsPanicModalVisible(false);
    };

    const handleCancel = () => {
        setIsPanicModalVisible(false);
    };

    return (
        <>
            {/* Red flash overlay */}
            {showFlash && (
                <div
                    className="panic-flash"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle, rgba(255,0,60,0.3) 0%, rgba(255,0,60,0.05) 70%)',
                        pointerEvents: 'none',
                        zIndex: 9998,
                    }}
                />
            )}

            <Button
                type="primary"
                danger
                onClick={handlePanicClick}
                size="large"
                style={{
                    background: 'linear-gradient(135deg, #ff003c, #b026ff)',
                    border: 'none',
                    boxShadow: '0 0 20px rgba(255, 0, 60, 0.4), 0 0 60px rgba(255, 0, 60, 0.1)',
                    fontWeight: 700,
                    fontSize: 16,
                    letterSpacing: '0.05em',
                    height: 48,
                    padding: '0 32px',
                }}
            >
                🚨 PANIC 🚨
            </Button>

            <Modal
                title={
                    <span style={{
                        fontFamily: "var(--font-display, 'Orbitron', monospace)",
                        color: '#ff003c',
                        textShadow: '0 0 10px rgba(255, 0, 60, 0.5)',
                    }}>
                        🚨 PANIC MODE ACTIVATED 🚨
                    </span>
                }
                open={isPanicModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
                footer={[
                    <Button key="submit" type="primary" onClick={handleOk}>
                        Panic Solved ✅
                    </Button>,
                ]}
            >
                <h3 style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Here is your custom excuse:
                </h3>

                <p style={{
                    textAlign: 'center',
                    fontSize: '1.3em',
                    fontWeight: 600,
                    color: '#00f0ff',
                    textShadow: '0 0 8px rgba(0, 240, 255, 0.4)',
                    margin: '20px 0',
                }}>
                    {excuse}
                </p>
            </Modal>
        </>
    );
}