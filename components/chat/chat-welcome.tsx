import { Book, Hash } from "lucide-react";

interface ChatWelcomeProps {
    name: string;
    type: "channel" | "conversation";
}

export const ChatWelcome = ({
    name,
    type
}: ChatWelcomeProps) => {
    return (
        <div className="space-y-2 px-4 mb-4">
            {type === "channel" && (
                <div className="h-[75px] w-[75px] rounded-full bg-zinc-500 dark:bg-zinc-700 flex items-center justify-center">
                    <Book className="w-12 h-12 text-white"/>
                </div>
            )}
            <p className="text-xl md:text-3xl font-bold">
                {type === "channel" ? "Chào mừng đến #" : ""} {name}
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                {type === "channel"
                    ? `Đây là khởi đầu của lớp học #${name}.`
                    : `Đây là khởi đầu của cuộc trò chuyện với ${name}`
                }
            </p>
        </div>
    )
};