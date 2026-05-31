# SNN Sandbox 系統架構圖 (System Structure)

本文件詳述了 SNN 視覺化沙盒的「解耦式」軟體架構、模組職責以及資料流向。

---

## 1. 模組職責說明 (Module Responsibilities)

系統採用高度解耦的層級式架構，將「計算」、「物理」、「學習」與「紀錄」徹底分離。

### I. UI & Orchestration Layer (介面與協調層)
*   **`BasicLIFSandbox.vue`**: 系統中樞。負責管理 Vue 響應式狀態、建立 `SNNNetwork` 拓撲，並觸發模擬與繪圖。

### II. Network & Monitoring Layer (網路、核心與監控)
*   **`core/SNNNetwork.ts`**: 全局協調者。執行「正向路由（物理）」與「反向路由（學習）」雙階段演算法，並廣播模擬事件。
*   **`core/Connection.ts`**: **職責平行化**。持有獨立的 `transmission` (物理) 與 `learningRule` (學習) 通道。
*   **`monitors/`**: 包含 `StateMonitor` 與 `SynapseMonitor`。掛載於網路 Hook，實現資料非侵入式採集。

### III. Neuron & Source Layer (節點與訊號源)
*   **`LIFNeuron.ts` / `ALIFNeuron.ts`**: 實作 $dV/dt$ 積分與發火邏輯，具備「自我感知」電流的能力。
*   **`SpikeGeneratorNode.ts`**: 輕量級 Poisson 脈衝產生器。

### IV. Synapse Module (突觸三權分立)
*   **`interfaces/`**: 定義 `ISynapseDynamics` (動態), `ISynapsePhysics` (物理), `ILearningRule` (學習) 三大原子介面。
*   **`dynamics/`**: 計算訊號強度 $S(t)$（如 Static, STP, STDP）。
*   **`physics/`**: 物理裝飾器。將 $S(t)$ 轉為 $I_{syn}$（如 Cuba, Coba）。**物理層完全不感知學習層的存在。**

---

## 2. Mermaid 類別關聯圖 (Class Diagram)

```mermaid
classDiagram
    direction TB

    %% 第一層：抽象介面層 (The Foundations)
    class INetworkNode {
        <<interface>>
        +hasSpiked boolean
        +getVoltage() number
        +getTotalCurrent() number
        +step(dt, t, syn, ext)
    }
    class ISynapseDynamics {
        <<interface>>
        +step(dt, preSpike) number
    }
    class ISynapsePhysics {
        <<interface>>
        +getEquivalentCurrent(dt, pre, v) number
    }
    class ILearningRule {
        <<interface>>
        +onPostSpike() void
    }

    %% 第二層：核心架構層 (Depends on Interfaces)
    class SNNNetwork {
        -nodes Map
        -connections Connection[]
        +step(dt, time)
    }
    class Connection {
        +transmission ISynapsePhysics
        +learningRule ILearningRule
    }
    class StateMonitor {
        -record(time, network)
    }
    class SynapseMonitor {
        -record(network)
    }

    %% 第三層：具體實作層 (Satisfies Interfaces)
    class LIFNeuron {
        #v number
        #current_i number
    }
    class ALIFNeuron {
        -w number
    }
    class SpikeGeneratorNode {
        +hasSpiked boolean
    }
    class BaseSynapse {
        <<abstract>>
        #signalStrength number
    }
    class StaticSynapse
    class STPSynapse
    class STDPSynapse
    class CubaSynapse
    class CobaSynapse

    %% --- 建立關係 (由實作指向抽象) ---

    %% Node 體系
    INetworkNode <|.. LIFNeuron : implements
    INetworkNode <|.. SpikeGeneratorNode : implements
    LIFNeuron <|-- ALIFNeuron : extends

    %% Synapse Dynamics 體系
    ISynapseDynamics <|.. BaseSynapse : implements
    BaseSynapse <|-- StaticSynapse : extends
    BaseSynapse <|-- STPSynapse : extends
    BaseSynapse <|-- STDPSynapse : extends
    ILearningRule <|.. STDPSynapse : implements

    %% Synapse Physics 體系
    ISynapsePhysics <|.. CubaSynapse : implements
    ISynapsePhysics <|.. CobaSynapse : implements

    %% 組合與依賴
    SNNNetwork "1" *-- "many" Connection : manages
    SNNNetwork "1" *-- "many" INetworkNode : coordinates
    Connection "1" o-- "1" ISynapsePhysics : transmission
    Connection "1" o-- "0..1" ILearningRule : learning
    CubaSynapse o-- ISynapseDynamics : decorates
    CobaSynapse o-- ISynapseDynamics : decorates
    
    StateMonitor ..> INetworkNode : pulls data
    SynapseMonitor ..> STDPSynapse : pulls weight
```

---

## 3. 模擬資料流向圖 (Simulation Sequence Diagram)

此圖展示了在「介面隔離」重構後，系統如何實現物理傳遞與學習更新的平行運作。

```mermaid
sequenceDiagram
    autonumber
    participant UI as Vue UI (Sandbox)
    participant Net as SNNNetwork
    participant SynPhys as Synapse Physics
    participant SynDyn as Synapse Dynamics
    participant Node as Neuron Node
    participant Learn as Learning Rule (STDP)

    UI->>Net: step(dt, time)
    
    rect rgb(30, 30, 40)
    Note over Net, SynDyn: 1. 正向路由 (Forward: Signal Transmission)
    Net->>SynPhys: getEquivalentCurrent(preSpike, v)
    SynPhys->>SynDyn: step(dt, preSpike)
    SynDyn-->>SynPhys: 回傳 S(t)
    SynPhys-->>Net: 回傳 I_syn (物理轉換後)
    end

    rect rgb(40, 40, 30)
    Note over Net, Node: 2. 狀態積分 (Integration)
    Net->>Node: step(total_i)
    Node->>Node: 求解微分方程，更新 v 與 hasSpiked
    end

    rect rgb(40, 30, 40)
    Note over Net, Learn: 3. 反向學習 (Backward: Plasticity)
    opt 若 Target Node 本回合發火
        Net->>Learn: onPostSpike()
        Learn->>Learn: 執行 LTP 更新權重 w
    end
    end

    rect rgb(30, 40, 30)
    Note over Net, UI: 4. 監聽廣播 (Monitoring)
    Net->>UI: 廣播 postStep 事件 -> Monitor 採集資料渲染
    end
```
