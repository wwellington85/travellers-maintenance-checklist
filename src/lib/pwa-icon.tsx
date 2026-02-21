import React from "react";

type PwaIconProps = {
  size: number;
  maskable?: boolean;
};

export function PwaIcon({ size, maskable = false }: PwaIconProps) {
  const pad = maskable ? Math.round(size * 0.18) : Math.round(size * 0.1);
  const cardRadius = Math.round((size - pad * 2) * 0.22);
  const cardSize = size - pad * 2;
  const stroke = Math.max(2, Math.round(size * 0.01));
  const leafStroke = Math.max(2, Math.round(size * 0.006));
  const tStroke = Math.max(12, Math.round(size * 0.055));

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0B5E55 0%, #083B5B 100%)",
      }}
    >
      <div
        style={{
          width: cardSize,
          height: cardSize,
          borderRadius: cardRadius,
          border: `${stroke}px solid rgba(155, 215, 204, 0.7)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
        }}
      >
        <svg
          viewBox="0 0 1000 1000"
          width={Math.round(cardSize * 0.9)}
          height={Math.round(cardSize * 0.9)}
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block" }}
        >
          <path
            d="M180 300 C 250 170, 455 145, 705 180 C 770 190, 825 175, 835 125"
            stroke="#F3E7B2"
            strokeWidth={tStroke}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M835 125 C 870 155, 860 210, 805 235"
            stroke="#F3E7B2"
            strokeWidth={Math.max(8, Math.round(tStroke * 0.7))}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M510 250 C 485 370, 462 545, 448 825"
            stroke="#F3E7B2"
            strokeWidth={Math.max(10, Math.round(tStroke * 0.85))}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M300 875 C 425 852, 545 850, 675 865"
            stroke="#F3E7B2"
            strokeWidth={Math.max(8, Math.round(tStroke * 0.65))}
            strokeLinecap="round"
            fill="none"
          />

          <path
            d="M465 860 C 520 755, 555 635, 585 300"
            stroke="#D6F3EC"
            strokeWidth={leafStroke}
            strokeLinecap="round"
            fill="none"
          />

          <path d="M472 800 C 440 760, 410 720, 395 680" stroke="#D6F3EC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
          <path d="M486 754 C 448 730, 420 700, 405 660" stroke="#D6F3EC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
          <path d="M500 708 C 455 690, 430 665, 415 625" stroke="#D6F3EC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
          <path d="M514 665 C 468 648, 443 626, 430 588" stroke="#D6F3EC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
          <path d="M527 622 C 478 608, 456 590, 442 553" stroke="#D6F3EC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
          <path d="M540 580 C 492 566, 470 550, 458 517" stroke="#D6F3EC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
          <path d="M552 542 C 503 528, 482 515, 470 485" stroke="#D6F3EC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
          <path d="M564 506 C 517 495, 497 482, 485 455" stroke="#D6F3EC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
          <path d="M575 472 C 530 460, 513 450, 502 425" stroke="#D6F3EC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />

          <path d="M492 774 C 540 748, 585 715, 625 675" stroke="#9BD7CC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
          <path d="M505 728 C 550 705, 590 677, 628 642" stroke="#9BD7CC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
          <path d="M518 684 C 562 664, 602 640, 636 608" stroke="#9BD7CC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
          <path d="M531 642 C 574 625, 608 604, 641 576" stroke="#9BD7CC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
          <path d="M543 603 C 586 588, 620 570, 650 545" stroke="#9BD7CC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
          <path d="M555 566 C 595 553, 627 538, 655 515" stroke="#9BD7CC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
          <path d="M566 531 C 602 520, 630 507, 658 485" stroke="#9BD7CC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
          <path d="M576 496 C 610 486, 638 474, 663 454" stroke="#9BD7CC" strokeWidth={leafStroke} strokeLinecap="round" fill="none" />
        </svg>
      </div>
    </div>
  );
}
