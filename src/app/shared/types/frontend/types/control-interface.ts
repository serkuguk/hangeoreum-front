import {ControlItemInterface} from '@app/shared/types/frontend/types/control-item-interface';

export interface ControlInterface {
  items?: ControlItemInterface[]
  changed?: () => void
  map?: () => void
}
