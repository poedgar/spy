import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';
import echo from '@/echo';

interface PresenceMember {
    id: number;
    codename: string;
}

const onlineUserIds: Ref<Set<number>> = ref(new Set());
let subscriberCount = 0;

export function usePresence(): { onlineUserIds: Ref<Set<number>> } {
    onMounted(() => {
        subscriberCount += 1;

        if (subscriberCount === 1) {
            echo.join('online-users')
                .here((members: PresenceMember[]) => {
                    onlineUserIds.value = new Set(
                        members.map((member) => member.id),
                    );
                })
                .joining((member: PresenceMember) => {
                    onlineUserIds.value = new Set(onlineUserIds.value).add(
                        member.id,
                    );
                })
                .leaving((member: PresenceMember) => {
                    const next = new Set(onlineUserIds.value);
                    next.delete(member.id);
                    onlineUserIds.value = next;
                });
        }
    });

    onBeforeUnmount(() => {
        subscriberCount -= 1;

        if (subscriberCount === 0) {
            echo.leave('online-users');
            onlineUserIds.value = new Set();
        }
    });

    return { onlineUserIds };
}
