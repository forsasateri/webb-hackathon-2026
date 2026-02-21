import { Button, Modal } from "antd";
import Title from "antd/es/skeleton/Title";
import { useState } from "react";
import { getRandomExcuse } from "../shared/excuses";


export const PanicButton = () => {
    const [isPanicModalVisible, setIsPanicModalVisible] = useState(false);
    const [excuse, setExcuse] = useState("");

    const handlePanicClick = () => {
        setExcuse(getRandomExcuse());
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
            <Button type="primary" danger onClick={handlePanicClick} size="large">
                🚨PANIC🚨
            </Button>

            <Modal
                title="🚨 PANIC MODE ACTIVATED 🚨"
                open={isPanicModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
                footer={[
                    <Button key="submit" type="primary" onClick={handleOk}>
                        Panic Solved ✅
                    </Button>,
                ]}
            >

                <h3 style={{ textAlign: 'center' }}>
                    Here is your custom excuse:
                </h3>

                <p style={{ textAlign: 'center', fontSize: '1.2em' }}>{excuse}</p>
            </Modal>
        </>
    );
}