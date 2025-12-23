import React from "react";
import { PageContainer } from "@project/ui-components";

import ApprovalHeader from "./components/ApprovalHeader";
import ApprovalTabs from "./components/ApprovalTabs";
import DelegateModal from "./components/DelegateModal";
import { useApproval } from "./useApproval";

const Approval: React.FC = () => {
  const approval = useApproval();

  return (
    <PageContainer>
      <ApprovalHeader userRole={approval.userRole} />

      <ApprovalTabs
        pendingList={approval.pendingList}
        historyList={approval.historyList}
        onViewDetail={approval.viewDetail}
        onQuickApprove={approval.quickApprove}
        onOpenDelegate={approval.openDelegate}
      />

      <DelegateModal
        open={approval.delegateVisible}
        currentUserRole={approval.userRole}
        delegateToRole={approval.delegateToRole}
        onChangeRole={approval.setDelegateToRole}
        onCancel={() => approval.setDelegateVisible(false)}
        onConfirm={approval.confirmDelegate}
      />
    </PageContainer>
  );
};

export default Approval;
