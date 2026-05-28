import 'dotenv/config';
interface ServiceResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}
export declare function creditAgentWallet(agentUserId: string, amountCents: number, type: string): Promise<ServiceResult>;
export declare function settleAgentWallet(agentUserId: string): Promise<ServiceResult>;
export declare function holdAgentCommission(agentUserId: string, amountCents: number, reason: string): Promise<ServiceResult>;
export declare function getCashSettlementSummary(agentUserId: string): Promise<ServiceResult>;
export {};
//# sourceMappingURL=agent-wallet.service.d.ts.map