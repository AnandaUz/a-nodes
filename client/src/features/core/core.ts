import { Store } from '@/features/core/store';
import { NodeRenderer } from '@features/nodes/node-renderer';

import { Desk } from '@/features/desk/desk';
import { getToken } from '@/services/auth.service';
import { LocalPersistence } from './local-persistence';
import { ServerPersistence } from './server-persistence';

export class Core {
  static store: Store;
  static renderer: NodeRenderer;
  static desk: Desk;
  static localPersistence:   LocalPersistence;
  static serverPersistence:  ServerPersistence;

  static async init(params: Record<string, string>) {    
    const container = document.getElementById('main')!
    const deskId = params['id'] ?? 'root';

    const token  = getToken() ?? undefined;
    
    const desk = new Desk();
    Core.desk = desk;
    await desk.mount(container);

    const store = new Store();
    const nodeRender = new NodeRenderer();  


    Core.store = store;
    Core.renderer = nodeRender;  

    Core.renderer.bindStore();

    this.localPersistence  = new LocalPersistence(store, deskId);
    this.localPersistence.init();
    this.serverPersistence = new ServerPersistence(store, {
        apiUrl: '/api/nodes',
        deskId: deskId,
        token:  token,
    });    
    await this.serverPersistence.init();
  }

}