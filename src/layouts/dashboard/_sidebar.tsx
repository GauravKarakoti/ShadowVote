import cn from 'classnames';

import Button from '@/components/ui/button';
import routes from '@/config/routes';

import { HomeIcon } from '@/components/icons/home';


const menuItems = [
  {
    name: 'Getting Started',
    icon: <HomeIcon />,
    href: routes.admin,
  },


];

type SidebarProps = {
  className?: string;
};


