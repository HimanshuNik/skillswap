import { useState } from 'react';
import AppLayout from '../components/app/AppLayout';
import SwapRequestCard from '../components/requests/SwapRequestCard';
import {
  useIncomingRequests,
  useOutgoingRequests,
  useAcceptSwapRequest,
  useRejectSwapRequest,
  useCancelSwapRequest,
} from '../hooks/useSwapRequests';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';

type ActiveTab = 'incoming' | 'outgoing';

const Requests = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('incoming');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(
    null
  );

  const {
    data: incomingRequests,
    isLoading: isIncomingLoading,
    isError: isIncomingError,
    refetch: refetchIncoming,
  } = useIncomingRequests();

  const {
    data: outgoingRequests,
    isLoading: isOutgoingLoading,
    isError: isOutgoingError,
    refetch: refetchOutgoing,
  } = useOutgoingRequests();

  const acceptMutation = useAcceptSwapRequest();
  const rejectMutation = useRejectSwapRequest();
  const cancelMutation = useCancelSwapRequest();

  const pendingIncomingCount =
    incomingRequests?.filter((r) => r.status === 'PENDING').length ?? 0;

  const handleAccept = async (requestId: number) => {
    try {
      setFeedback(null);
      await acceptMutation.mutateAsync(requestId);
      setFeedback({
        message: 'Swap request accepted! Your conversation is now active.',
        type: 'success',
      });
    } catch (err: unknown) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Failed to accept swap request.',
        type: 'error',
      });
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      setFeedback(null);
      await rejectMutation.mutateAsync(requestId);
      setFeedback({
        message: 'Swap request declined.',
        type: 'success',
      });
    } catch (err: unknown) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Failed to decline swap request.',
        type: 'error',
      });
    }
  };

  const handleCancel = async (requestId: number) => {
    try {
      setFeedback(null);
      await cancelMutation.mutateAsync(requestId);
      setFeedback({
        message: 'Swap request cancelled.',
        type: 'success',
      });
    } catch (err: unknown) {
      setFeedback({
        message: err instanceof Error ? err.message : 'Failed to cancel swap request.',
        type: 'error',
      });
    }
  };

  const currentRequests = activeTab === 'incoming' ? incomingRequests : outgoingRequests;
  const isLoading = activeTab === 'incoming' ? isIncomingLoading : isOutgoingLoading;
  const isError = activeTab === 'incoming' ? isIncomingError : isOutgoingError;
  const isProcessing =
    acceptMutation.isPending || rejectMutation.isPending || cancelMutation.isPending;

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        {/* Page Header */}
        <div>
          <p className="text-sm font-semibold text-emerald-600">Requests</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Skill Swap Requests
          </h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            Manage incoming proposals from members who want to exchange skills with you, and track the
            requests you've sent.
          </p>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            role="alert"
            className={`mt-6 rounded-2xl border p-4 text-sm font-medium ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Tabs */}
        <div className="mt-8 flex gap-3 border-b border-slate-200 pb-px" role="tablist" aria-label="Swap requests tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'incoming'}
            onClick={() => {
              setActiveTab('incoming');
              setFeedback(null);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeTab === 'incoming'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-950'
            }`}
          >
            <span>Incoming Requests</span>
            {pendingIncomingCount > 0 && (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                {pendingIncomingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'outgoing'}
            onClick={() => {
              setActiveTab('outgoing');
              setFeedback(null);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              activeTab === 'outgoing'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-950'
            }`}
          >
            <span>Sent Requests</span>
            {outgoingRequests && outgoingRequests.length > 0 && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                {outgoingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="mt-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-slate-200" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 rounded bg-slate-200" />
                    <div className="h-3 w-24 rounded bg-slate-200" />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="h-16 rounded-xl bg-slate-100" />
                  <div className="h-16 rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="mt-8">
            <ErrorState
              title="Failed to load requests"
              message="An error occurred while fetching your swap requests. Please try again."
              onRetry={() => (activeTab === 'incoming' ? refetchIncoming() : refetchOutgoing())}
            />
          </div>
        )}

        {/* Requests List */}
        {!isLoading && !isError && currentRequests && currentRequests.length > 0 && (
          <div className="mt-6 space-y-4">
            {currentRequests.map((request) => (
              <SwapRequestCard
                key={request.id}
                request={request}
                type={activeTab}
                onAccept={handleAccept}
                onReject={handleReject}
                onCancel={handleCancel}
                isProcessing={isProcessing}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && (!currentRequests || currentRequests.length === 0) && (
          <div className="mt-8">
            <EmptyState
              title={activeTab === 'incoming' ? 'No incoming requests' : 'No sent requests'}
              description={
                activeTab === 'incoming'
                  ? "You don't have any incoming skill swap proposals yet. Explore community members and invite them to swap!"
                  : "You haven't proposed any skill swaps yet. Discover complementary peers and start learning together!"
              }
              actionLabel="Explore Discover"
              onAction={() => window.location.assign("/discover")}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Requests;
