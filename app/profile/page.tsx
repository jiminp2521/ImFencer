import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress" // Need to ensure Progress component is installed or standard

export default function ProfilePage() {
    return (
        <div className="pb-20">
            <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <h1 className="text-xl font-bold tracking-tight text-white">My Page</h1>
                <button className="text-gray-400 hover:text-white">
                    Settings
                </button>
            </header>

            <div className="p-4 space-y-6">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border-2 border-white/10">
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-white">FencerJimin</h2>
                            <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20">Gold Tier</Badge>
                        </div>
                        <p className="text-gray-400 text-sm">Seoul Fencing Club • Epee</p>

                        {/* XP Bar */}
                        <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-[10px] text-gray-500">
                                <span>Lv. 12</span>
                                <span>1200 / 2000 XP</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-[60%] rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats / Quick links */}
                <div className="grid grid-cols-3 gap-3">
                    <Card className="bg-gray-900 border-gray-800 p-3 text-center">
                        <div className="text-xl font-bold text-white">12</div>
                        <div className="text-xs text-gray-500">Matches</div>
                    </Card>
                    <Card className="bg-gray-900 border-gray-800 p-3 text-center">
                        <div className="text-xl font-bold text-white">5</div>
                        <div className="text-xs text-gray-500">Awards</div>
                    </Card>
                    <Card className="bg-gray-900 border-gray-800 p-3 text-center">
                        <div className="text-xl font-bold text-white">85%</div>
                        <div className="text-xs text-gray-500">Win Rate</div>
                    </Card>
                </div>

                {/* Awards Section */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        Awards
                        <span className="text-xs font-normal text-gray-500 bg-gray-900 px-2 py-0.5 rounded-full">5</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex flex-col items-center gap-2 relative overflow-hidden group">
                            <div className="absolute top-2 right-2 text-amber-500">
                                {/* Gold Medal Icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.625v3.198a9.75 9.75 0 00-6.233 4.869.75.75 0 00.915 1.056c3.425-.97 7.04-1.121 10.658-.33a.75.75 0 00.915-1.056 9.75 9.75 0 00-6.233-4.869V9.647a6.753 6.753 0 006.138-5.625.75.75 0 00-.584-.859 47.456 47.456 0 00-3.07-.543V2.62a.75.75 0 00-1.5 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-2xl">🥇</div>
                            <p className="text-sm font-medium text-white text-center leading-tight">National Amateur Open</p>
                            <p className="text-[10px] text-gray-500">2023.12.10</p>
                        </div>
                        {/* Placeholder for others */}
                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex flex-col items-center gap-2 border-dashed">
                            <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center text-gray-600">
                                +
                            </div>
                            <p className="text-sm font-medium text-gray-500 text-center">Add Award</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
