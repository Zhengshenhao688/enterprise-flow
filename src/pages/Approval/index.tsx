import React from "react";
import { Card } from "antd";

import ApprovalHeader from "./ApprovalHeader";
import ApprovalTabs from "./ApprovalTabs";
import DelegateModal from "./DelegateModal";
import { useApproval } from "./useApproval";

const Approval: React.FC = () => {
  const approval = useApproval();

  return (
    <div style={{ padding: 24 }}>
      <Card variant="outlined">
        <ApprovalHeader userRole={approval.userRole} />

        <ApprovalTabs
          pendingList={approval.pendingList}
          historyList={approval.historyList}
          onViewDetail={approval.viewDetail}
          onQuickApprove={approval.quickApprove}
          onOpenDelegate={approval.openDelegate}
        />
      </Card>

      <DelegateModal
        open={approval.delegateVisible}
        currentUserRole={approval.userRole}
        delegateToRole={approval.delegateToRole}
        onChangeRole={approval.setDelegateToRole}
        onCancel={() => approval.setDelegateVisible(false)}
        onConfirm={approval.confirmDelegate}
      />
    </div>
  );
};

export default Approval;
