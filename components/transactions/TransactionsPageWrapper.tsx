"use client";

import * as React from "react";
import { Tabs } from "@/components/ui/Tabs";
import {
  TransactionListView,
  type TransactionRecord,
} from "./TransactionListView";
import { CategoryWalletManager } from "./CategoryWalletManager";
import { type Category, type Wallet } from "./TransactionSheet";

interface TransactionsPageWrapperProps {
  initialTransactions: TransactionRecord[];
  categories: Category[];
  wallets: Wallet[];
  userCurrency: string;
}

export function TransactionsPageWrapper({
  initialTransactions,
  categories: initCategories,
  wallets: initWallets,
  userCurrency,
}: TransactionsPageWrapperProps) {
  const [activeTab, setActiveTab] = React.useState("ledger");
  const [categories, setCategories] = React.useState(initCategories);
  const [wallets, setWallets] = React.useState(initWallets);

  const refreshMeta = React.useCallback(async () => {
    try {
      const [catRes, walRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/wallets"),
      ]);
      if (catRes.ok) {
        const d = await catRes.json();
        setCategories(d.categories || []);
      }
      if (walRes.ok) {
        const d = await walRes.json();
        setWallets(d.wallets || []);
      }
    } catch (e) {
      console.error("Meta refresh error", e);
    }
  }, []);

  return (
    <div className="space-y-6">
      <Tabs
        tabs={[
          { id: "ledger", label: "Ledger" },
          { id: "meta", label: "Categories & Wallets" },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "ledger" ? (
        <TransactionListView
          initialTransactions={initialTransactions}
          categories={categories}
          wallets={wallets}
          userCurrency={userCurrency}
        />
      ) : (
        <CategoryWalletManager
          categories={categories}
          wallets={wallets}
          userCurrency={userCurrency}
          onRefresh={refreshMeta}
        />
      )}
    </div>
  );
}

