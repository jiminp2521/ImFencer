'use client';

import { StartChatButton } from '@/components/chat/StartChatButton';

type ContactSellerButtonProps = {
  sellerId: string;
  marketTitle: string;
};

export function ContactSellerButton({ sellerId, marketTitle }: ContactSellerButtonProps) {
  return (
    <StartChatButton
      targetUserId={sellerId}
      contextTitle={marketTitle}
      openingMessage={`${marketTitle} 상품 문의드립니다.`}
      label="판매자에게 문의하기"
      loginNext="/market"
      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
      variant="default"
      size="default"
    />
  );
}
