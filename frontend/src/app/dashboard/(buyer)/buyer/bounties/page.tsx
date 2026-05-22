"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiService } from "@/utils/api";
import { Target, ShieldAlert, PlusCircle, History } from "lucide-react";

export default function BuyerBountiesPage() {
  const [bounties, setBounties] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    target_username: "",
    reason: "",
    evidence_links: "",
    reward_amount: 100,
  });

  useEffect(() => {
    // In a real app, this would fetch from apiService.getOpenBounties()
    // Mocking for architecture demonstration
    setBounties([
      { id: "1", target: "crypto_scammer99", status: "investigating", reward: 500, date: "2026-05-10", reason: "Fake API key sold" },
      { id: "2", target: "shadow_broker", status: "open", reward: 250, date: "2026-05-12", reason: "Duplicate listings" },
    ]);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // apiService.postBounty(formData)
    setBounties([{
      id: Math.random().toString(),
      target: formData.target_username,
      status: "open",
      reward: formData.reward_amount,
      date: new Date().toISOString().split("T")[0],
      reason: formData.reason,
    }, ...bounties]);
    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Target className="h-8 w-8 text-red-500" />
            Bounty Hunter Network
          </h2>
          <p className="text-muted-foreground mt-1">Post bounties on fraudulent sellers to protect the ecosystem.</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="bg-red-600 hover:bg-red-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          {isCreating ? "Cancel" : "Post New Bounty"}
        </Button>
      </div>

      {isCreating && (
        <Card className="border-red-900/30 bg-black/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Issue Fraud Bounty
            </CardTitle>
            <CardDescription>Escrow funds will be locked to fund this bounty upon confirmation.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Target Username</label>
                  <Input 
                    placeholder="e.g. scammer_123" 
                    className="bg-zinc-900/50"
                    value={formData.target_username}
                    onChange={e => setFormData({...formData, target_username: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Reward Amount (USDT)</label>
                  <Input 
                    type="number" 
                    min="50" 
                    className="bg-zinc-900/50"
                    value={formData.reward_amount}
                    onChange={e => setFormData({...formData, reward_amount: Number(e.target.value)})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Reason for Bounty</label>
                <Select onValueChange={v => setFormData({...formData, reason: v})}>
                  <SelectTrigger className="bg-zinc-900/50">
                    <SelectValue placeholder="Select primary reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plagiarism">Stolen / Plagiarized Content</SelectItem>
                    <SelectItem value="fake_product">Fake / Non-functional Product</SelectItem>
                    <SelectItem value="malware">Embedded Malware</SelectItem>
                    <SelectItem value="scam_behavior">General Scam Behavior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Evidence Links (Optional)</label>
                <Textarea 
                  placeholder="Link to transaction IDs, pastebin of chat logs, etc." 
                  className="bg-zinc-900/50"
                  value={formData.evidence_links}
                  onChange={e => setFormData({...formData, evidence_links: e.target.value})}
                />
              </div>
              <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">Submit to Investigation Queue</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bounties.map((bounty) => (
          <Card key={bounty.id} className="border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className={
                  bounty.status === 'open' ? 'border-red-500 text-red-500' : 'border-yellow-500 text-yellow-500'
                }>
                  {bounty.status.toUpperCase()}
                </Badge>
                <span className="text-lg font-mono font-bold text-green-400">${bounty.reward}</span>
              </div>
              <CardTitle className="mt-2 text-xl truncate text-white">Target: {bounty.target}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400 mb-4">{bounty.reason}</p>
              <div className="flex items-center text-xs text-zinc-500 gap-1">
                <History className="h-3 w-3" />
                Posted: {bounty.date}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
